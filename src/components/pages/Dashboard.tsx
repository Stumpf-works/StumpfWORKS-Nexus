import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Server, Plus, Clock, Activity, Terminal, FolderOpen, X,
  BarChart3, Zap, HardDrive, Network
} from "lucide-react";
import { useHostStore } from "../../store/hostStore";
import { useSessionStore } from "../../store/sessionStore";

export default function Dashboard() {
  const navigate = useNavigate();
  const { hosts, fetchHosts } = useHostStore();
  const { sessions, createSession, closeSession, fetchSessions } = useSessionStore();

  useEffect(() => {
    fetchHosts();
    fetchSessions();
  }, [fetchHosts, fetchSessions]);

  const recentHosts = [...hosts]
    .sort((a, b) => {
      if (!a.last_connected) return 1;
      if (!b.last_connected) return -1;
      return new Date(b.last_connected).getTime() - new Date(a.last_connected).getTime();
    })
    .slice(0, 5);

  const connectedSessions = sessions.filter((s) => s.status === "connected");
  const connectingSessions = sessions.filter((s) => s.status === "connecting" || s.status === "reconnecting");

  const handleQuickConnect = async (host: typeof hosts[0]) => {
    try {
      const session = await createSession(host.id, host.name);
      navigate(`/terminal/${session.id}`);
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const handleCloseSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await closeSession(sessionId);
    } catch (error) {
      console.error("Failed to close session:", error);
    }
  };

  const avgLatency = connectedSessions.length > 0
    ? Math.round(connectedSessions.reduce((sum, s) => sum + (s.latency_ms || 0), 0) / connectedSessions.length)
    : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-white to-text-secondary bg-clip-text text-transparent">
          Welcome to Nexus
        </h1>
        <p className="text-text-secondary text-lg">
          Connect to your servers and manage your infrastructure with ease
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card group">
          <div className="stat-card-icon from-accent to-accent-light glow-accent">
            <Server className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white">
              {hosts.length}
            </p>
            <p className="text-sm text-text-secondary">Total Servers</p>
          </div>
        </div>

        <div className="stat-card group">
          <div className="stat-card-icon from-success to-teal glow-success">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white">
              {connectedSessions.length}
            </p>
            <p className="text-sm text-text-secondary">Active Sessions</p>
          </div>
        </div>

        <div className="stat-card group">
          <div className="stat-card-icon from-warning to-pink glow-warning">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white">
              {connectingSessions.length}
            </p>
            <p className="text-sm text-text-secondary">Connecting</p>
          </div>
        </div>

        <div className="stat-card group">
          <div className="stat-card-icon from-purple to-pink">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{avgLatency}ms</p>
            <p className="text-sm text-text-secondary">Avg Latency</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="floating-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              Recent Connections
            </h2>
            <button
              onClick={() => navigate("/settings?tab=hosts")}
              className="btn-ghost flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Server
            </button>
          </div>

          {recentHosts.length > 0 ? (
            <div className="space-y-2">
              {recentHosts.map((host) => (
                <button
                  key={host.id}
                  onClick={() => handleQuickConnect(host)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl glass-button group text-left"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center glow-accent transition-all duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${host.color || "#0A84FF"}, ${host.color || "#0A84FF"}dd)`,
                    }}
                  >
                    <Server className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-lg truncate">
                      {host.name}
                    </div>
                    <div className="text-sm text-text-secondary truncate">
                      {host.username}@{host.hostname}:{host.port}
                    </div>
                  </div>
                  <Terminal className="w-5 h-5 text-text-secondary group-hover:text-accent transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto">
                <Server className="w-10 h-10 text-text-secondary" />
              </div>
              <div>
                <p className="text-text-secondary mb-4">No servers configured yet</p>
                <button
                  onClick={() => navigate("/settings?tab=hosts")}
                  className="btn-primary"
                >
                  Add Your First Server
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="floating-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-success" />
              Active Sessions
            </h2>
            <div className="status-badge">
              <div className="status-connected" />
              <span className="text-success font-medium">{connectedSessions.length} online</span>
            </div>
          </div>

          {sessions.length > 0 ? (
            <div className="space-y-2">
              {sessions.map((session) => {
                const host = hosts.find((h) => h.id === session.host_id);
                return (
                  <div
                    key={session.id}
                    className="flex items-center gap-4 p-4 rounded-xl glass-button group"
                  >
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        session.status === "connected"
                          ? "status-connected"
                          : session.status === "connecting" || session.status === "reconnecting"
                            ? "status-connecting"
                            : "status-error"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">
                        {session.name}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <span className="capitalize">{session.status}</span>
                        {session.latency_ms && (
                          <>
                            <span>•</span>
                            <span>{Math.round(session.latency_ms)}ms</span>
                          </>
                        )}
                        {host && (
                          <>
                            <span>•</span>
                            <span className="truncate">{host.hostname}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => navigate(`/terminal/${session.id}`)}
                        className="p-2 hover:bg-accent/20 hover:text-accent rounded-lg transition-all"
                        title="Open Terminal"
                      >
                        <Terminal className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/sftp/${session.id}`)}
                        className="p-2 hover:bg-teal/20 hover:text-teal rounded-lg transition-all"
                        title="Open SFTP"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleCloseSession(session.id, e)}
                        className="p-2 hover:bg-error/20 hover:text-error rounded-lg transition-all"
                        title="Close Session"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto">
                <Activity className="w-10 h-10 text-text-secondary" />
              </div>
              <div>
                <p className="text-white font-medium">No active sessions</p>
                <p className="text-sm text-text-secondary mt-1">
                  Connect to a server to get started
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="floating-card space-y-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-warning" />
          Quick Tips
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-panel space-y-2">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white/10 rounded text-sm font-mono">Cmd+K</kbd>
              <span className="text-text-secondary">or</span>
              <kbd className="px-2 py-1 bg-white/10 rounded text-sm font-mono">Ctrl+K</kbd>
            </div>
            <p className="text-sm text-text-secondary">Open command palette</p>
          </div>
          <div className="glass-panel space-y-2">
            <kbd className="px-2 py-1 bg-white/10 rounded text-sm font-mono">Double-click</kbd>
            <p className="text-sm text-text-secondary">Quick connect to server</p>
          </div>
          <div className="glass-panel space-y-2">
            <kbd className="px-2 py-1 bg-white/10 rounded text-sm font-mono">Right-click</kbd>
            <p className="text-sm text-text-secondary">Context menu for actions</p>
          </div>
        </div>
      </div>
    </div>
  );
}
