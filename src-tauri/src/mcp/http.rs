//! MCP HTTP/WebSocket Server Implementation
//!
//! Provides REST and WebSocket endpoints for AI integrations

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use futures::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;

use super::{
    handlers::{CapabilitiesMessage, JsonRpcRequest, JsonRpcResponse},
    permissions::ApprovalRequest,
    AiProvider, McpAbility, McpConfig, McpError, McpRequest,
};

/// Shared application state
pub struct AppState {
    pub config: McpConfig,
    pub pending_approvals: RwLock<Vec<ApprovalRequest>>,
    pub event_tx: broadcast::Sender<McpEvent>,
}

/// Events that can be broadcast to WebSocket clients
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum McpEvent {
    ApprovalRequired(ApprovalRequest),
    ApprovalResolved { id: Uuid, approved: bool },
    SessionOutput { session_id: Uuid, data: String },
    Error { message: String },
}

/// HTTP server for MCP
pub struct McpHttpServer {
    config: McpConfig,
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

impl McpHttpServer {
    pub fn new(config: McpConfig) -> Self {
        Self {
            config,
            shutdown_tx: None,
        }
    }

    /// Start the HTTP server
    pub async fn start(&mut self) -> Result<(), McpError> {
        if !self.config.enabled {
            return Err(McpError::NotEnabled);
        }

        let (event_tx, _) = broadcast::channel::<McpEvent>(100);
        let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();

        let state = Arc::new(AppState {
            config: self.config.clone(),
            pending_approvals: RwLock::new(Vec::new()),
            event_tx,
        });

        let cors = CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any);

        let app = Router::new()
            // REST endpoints
            .route("/health", get(health_check))
            .route("/capabilities", get(get_capabilities))
            .route("/rpc", post(handle_rpc))
            .route("/approvals", get(get_approvals))
            .route("/approvals/:id/approve", post(approve_request))
            .route("/approvals/:id/deny", post(deny_request))
            // WebSocket endpoint
            .route("/ws", get(websocket_handler))
            .layer(cors)
            .with_state(state);

        let addr = format!("127.0.0.1:{}", self.config.port);
        let listener = tokio::net::TcpListener::bind(&addr)
            .await
            .map_err(|e| McpError::ExecutionError(e.to_string()))?;

        tracing::info!("MCP HTTP server listening on {}", addr);

        self.shutdown_tx = Some(shutdown_tx);

        tokio::spawn(async move {
            axum::serve(listener, app)
                .with_graceful_shutdown(async {
                    let _ = shutdown_rx.await;
                })
                .await
                .ok();
        });

        Ok(())
    }

    /// Stop the HTTP server
    pub async fn stop(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
            tracing::info!("MCP HTTP server stopped");
        }
    }
}

// Handler functions

async fn health_check() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "ok",
        "service": "nexus-mcp",
        "version": "1.0.0"
    }))
}

async fn get_capabilities() -> impl IntoResponse {
    Json(CapabilitiesMessage::new())
}

#[derive(Deserialize)]
struct RpcRequest {
    jsonrpc: String,
    id: Option<serde_json::Value>,
    method: String,
    params: Option<serde_json::Value>,
}

async fn handle_rpc(
    State(state): State<Arc<AppState>>,
    Json(request): Json<RpcRequest>,
) -> impl IntoResponse {
    // Parse the method to an ability
    let ability = match parse_ability(&request.method) {
        Some(a) => a,
        None => {
            return Json(JsonRpcResponse::error(
                request.id,
                -32601,
                format!("Method not found: {}", request.method),
            ));
        }
    };

    // Create MCP request
    let mcp_request = McpRequest {
        id: Uuid::new_v4(),
        provider: AiProvider::Custom("http".to_string()),
        ability,
        params: request.params.unwrap_or(serde_json::json!({})),
        timestamp: chrono::Utc::now(),
    };

    // Check if provider is allowed
    if !state.config.allowed_providers.is_empty()
        && !state.config.allowed_providers.contains(&mcp_request.provider)
    {
        return Json(JsonRpcResponse::error(
            request.id,
            -32600,
            "Provider not allowed".to_string(),
        ));
    }

    // Execute the ability
    let result = execute_ability(&state, &mcp_request).await;

    match result {
        Ok(data) => Json(JsonRpcResponse::success(request.id, data)),
        Err(e) => Json(JsonRpcResponse::error(request.id, -32000, e.to_string())),
    }
}

async fn get_approvals(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let approvals = state.pending_approvals.read().await;
    Json(serde_json::json!({
        "approvals": *approvals
    }))
}

async fn approve_request(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> impl IntoResponse {
    let mut approvals = state.pending_approvals.write().await;
    if let Some(pos) = approvals.iter().position(|a| a.id == id) {
        approvals.remove(pos);
        let _ = state
            .event_tx
            .send(McpEvent::ApprovalResolved { id, approved: true });
        (StatusCode::OK, Json(serde_json::json!({"status": "approved"})))
    } else {
        (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Approval not found"})),
        )
    }
}

async fn deny_request(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> impl IntoResponse {
    let mut approvals = state.pending_approvals.write().await;
    if let Some(pos) = approvals.iter().position(|a| a.id == id) {
        approvals.remove(pos);
        let _ = state
            .event_tx
            .send(McpEvent::ApprovalResolved { id, approved: false });
        (StatusCode::OK, Json(serde_json::json!({"status": "denied"})))
    } else {
        (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Approval not found"})),
        )
    }
}

async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_websocket(socket, state))
}

async fn handle_websocket(socket: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();
    let mut event_rx = state.event_tx.subscribe();

    // Send capabilities on connect
    let caps = CapabilitiesMessage::new();
    let caps_msg = serde_json::to_string(&caps).unwrap();
    let _ = sender.send(Message::Text(caps_msg)).await;

    // Handle incoming messages and broadcast events
    loop {
        tokio::select! {
            // Handle incoming WebSocket messages
            msg = receiver.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        if let Ok(request) = serde_json::from_str::<JsonRpcRequest>(&text) {
                            let response = process_ws_request(&state, request).await;
                            let response_text = serde_json::to_string(&response).unwrap();
                            if sender.send(Message::Text(response_text)).await.is_err() {
                                break;
                            }
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => break,
                    _ => {}
                }
            }
            // Broadcast events to client
            event = event_rx.recv() => {
                if let Ok(event) = event {
                    let event_json = serde_json::to_string(&event).unwrap();
                    if sender.send(Message::Text(event_json)).await.is_err() {
                        break;
                    }
                }
            }
        }
    }
}

async fn process_ws_request(
    state: &Arc<AppState>,
    request: JsonRpcRequest,
) -> JsonRpcResponse {
    let ability = match parse_ability(&request.method) {
        Some(a) => a,
        None => {
            return JsonRpcResponse::error(
                request.id,
                -32601,
                format!("Method not found: {}", request.method),
            );
        }
    };

    let mcp_request = McpRequest {
        id: Uuid::new_v4(),
        provider: AiProvider::Custom("websocket".to_string()),
        ability,
        params: request.params.unwrap_or(serde_json::json!({})),
        timestamp: chrono::Utc::now(),
    };

    match execute_ability(state, &mcp_request).await {
        Ok(data) => JsonRpcResponse::success(request.id, data),
        Err(e) => JsonRpcResponse::error(request.id, -32000, e.to_string()),
    }
}

fn parse_ability(method: &str) -> Option<McpAbility> {
    match method {
        "nexus.server.list" => Some(McpAbility::ServerList),
        "nexus.ssh.connect" => Some(McpAbility::SshConnect),
        "nexus.ssh.execute" => Some(McpAbility::SshExecute),
        "nexus.ssh.upload" => Some(McpAbility::SshUpload),
        "nexus.ssh.download" => Some(McpAbility::SshDownload),
        "nexus.datasphere.get" => Some(McpAbility::DatasphereGet),
        "nexus.datasphere.set" => Some(McpAbility::DatasphereSet),
        "nexus.logs.stream" => Some(McpAbility::LogsStream),
        "nexus.ai.invoke" => Some(McpAbility::AiInvoke),
        _ => None,
    }
}

async fn execute_ability(
    _state: &Arc<AppState>,
    request: &McpRequest,
) -> Result<serde_json::Value, McpError> {
    // TODO: Connect to actual DataSphere and SSH modules
    match request.ability {
        McpAbility::ServerList => {
            // Get hosts from DataSphere
            Ok(serde_json::json!({
                "servers": []
            }))
        }
        McpAbility::SshConnect => {
            let host_id = request.params.get("host_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| McpError::InvalidRequest("Missing host_id".to_string()))?;

            Ok(serde_json::json!({
                "status": "connected",
                "session_id": Uuid::new_v4(),
                "host_id": host_id
            }))
        }
        McpAbility::SshExecute => {
            let command = request.params.get("command")
                .and_then(|v| v.as_str())
                .ok_or_else(|| McpError::InvalidRequest("Missing command".to_string()))?;

            tracing::info!("MCP executing command: {}", command);

            Ok(serde_json::json!({
                "stdout": format!("Output of: {}", command),
                "stderr": "",
                "exit_code": 0
            }))
        }
        McpAbility::SshUpload => {
            Ok(serde_json::json!({
                "status": "uploaded"
            }))
        }
        McpAbility::SshDownload => {
            Ok(serde_json::json!({
                "status": "downloaded"
            }))
        }
        McpAbility::DatasphereGet => {
            let key = request.params.get("key")
                .and_then(|v| v.as_str())
                .ok_or_else(|| McpError::InvalidRequest("Missing key".to_string()))?;

            Ok(serde_json::json!({
                "key": key,
                "value": null
            }))
        }
        McpAbility::DatasphereSet => {
            Ok(serde_json::json!({
                "status": "set"
            }))
        }
        McpAbility::LogsStream => {
            Ok(serde_json::json!({
                "status": "streaming"
            }))
        }
        McpAbility::AiInvoke => {
            let prompt = request.params.get("prompt")
                .and_then(|v| v.as_str())
                .ok_or_else(|| McpError::InvalidRequest("Missing prompt".to_string()))?;

            // TODO: Connect to Ollama or other local AI
            Ok(serde_json::json!({
                "response": format!("AI response to: {}", &prompt[..prompt.len().min(50)])
            }))
        }
    }
}
