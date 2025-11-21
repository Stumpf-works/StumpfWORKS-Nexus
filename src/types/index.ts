// Re-export all types from stores
export type { Host, HostGroup } from "../store/hostStore";
export type { Session, SessionStatus } from "../store/sessionStore";

// SSH Types
export interface SshConfig {
  host: string;
  port: number;
  username: string;
  auth_method: AuthMethod;
}

export type AuthMethod =
  | { type: "password"; data: string }
  | { type: "private_key"; data: { key_path: string; passphrase?: string } }
  | { type: "agent" };

export interface CommandOutput {
  stdout: string;
  stderr: string;
  exit_code: number;
}

// SFTP Types
export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: string | null;
  permissions: string | null;
}

export interface TransferProgress {
  session_id: string;
  path: string;
  progress: number;
  bytes_transferred: number;
  total_bytes: number;
}

// Settings Types
export type Theme = "light" | "dark" | "system";
export type CursorStyle = "block" | "underline" | "bar";

export interface Settings {
  theme: Theme;
  font_size: number;
  font_family: string;
  terminal_cursor_style: CursorStyle;
  terminal_cursor_blink: boolean;
  auto_reconnect: boolean;
  show_latency: boolean;
  sync_enabled: boolean;
  sync_provider: SyncProvider | null;
}

export type SyncProvider =
  | { type: "WebDAV"; url: string; username: string }
  | { type: "S3"; bucket: string; region: string }
  | { type: "Nextcloud"; url: string; username: string };

// Snippet Types
export interface Snippet {
  id: string;
  name: string;
  content: string;
  language: string | null;
  tags: string[];
  description: string | null;
  created_at: string;
  updated_at: string;
}

// MCP Types
export type AiProvider = "claude" | "chatgpt" | "ollama" | { custom: string };

export interface McpRequest {
  id: string;
  provider: AiProvider;
  ability: string;
  params: Record<string, unknown>;
}

export interface McpApprovalRequest {
  id: string;
  provider: AiProvider;
  ability: string;
  description: string;
  params_preview: string;
  timestamp: string;
}

// Event Types
export type AppEvent =
  | { type: "host_connected"; data: { host_id: string; session_id: string } }
  | { type: "host_disconnected"; data: { host_id: string; session_id: string } }
  | { type: "latency_update"; data: { session_id: string; latency_ms: number } }
  | { type: "file_transfer_progress"; data: TransferProgress }
  | { type: "file_transfer_complete"; data: { session_id: string; path: string } }
  | { type: "error"; data: { message: string } };
