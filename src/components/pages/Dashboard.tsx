import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Server, Plus, Clock, Activity } from "lucide-react";
import { useHostStore } from "../../store/hostStore";
import { useSessionStore } from "../../store/sessionStore";

export default function Dashboard() {
  const navigate = useNavigate();
  const { hosts, fetchHosts } = useHostStore();
  const { sessions, createSession } = useSessionStore();

  useEffect(() => {
    fetchHosts();
  }, [fetchHosts]);

  const recentHosts = [...hosts]
    .sort((a, b) => {
      if (!a.last_connected) return 1;
      if (!b.last_connected) return -1;
      return new Date(b.last_connected).getTime() - new Date(a.last_connected).getTime();
    })
    .slice(0, 5);

  const handleQuickConnect = async (host: typeof hosts[0]) => {
    try {
      const session = await createSession(host.id, host.name);
      navigate(`/terminal/${session.id}`);
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">
          Welcome to Nexus
        </h1>
        <p className="text-text-secondary mt-1">
          Connect to your servers and manage your infrastructure
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Connect */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary dark:text-text-primary-dark flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Connections
            </h2>
            <button
              onClick={() => navigate("/settings?tab=hosts")}
              className="btn-ghost text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {recentHosts.length > 0 ? (
            <div className="space-y-2">
              {recentHosts.map((host) => (
                <button
                  key={host.id}
                  onClick={() => handleQuickConnect(host)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: host.color || "#0A84FF" }}
                  >
                    <Server className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text-primary dark:text-text-primary-dark truncate">
                      {host.name}
                    </div>
                    <div className="text-xs text-text-secondary truncate">
                      {host.username}@{host.hostname}:{host.port}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Server className="w-12 h-12 text-text-secondary mx-auto mb-3" />
              <p className="text-text-secondary mb-4">No servers configured</p>
              <button
                onClick={() => navigate("/settings?tab=hosts")}
                className="btn-primary"
              >
                Add Your First Server
              </button>
            </div>
          )}
        </div>

        {/* Active Sessions */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary dark:text-text-primary-dark flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Active Sessions
            </h2>
            <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">
              {sessions.filter((s) => s.status === "connected").length} connected
            </span>
          </div>

          {sessions.length > 0 ? (
            <div className="space-y-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => navigate(`/terminal/${session.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      session.status === "connected"
                        ? "bg-success"
                        : session.status === "connecting"
                          ? "bg-warning animate-pulse"
                          : "bg-gray-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text-primary dark:text-text-primary-dark truncate">
                      {session.name}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {session.status}
                      {session.latency_ms && ` - ${session.latency_ms}ms`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-text-secondary">
              <p>No active sessions</p>
              <p className="text-xs mt-1">
                Double-click a server in the sidebar to connect
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="mt-6 card p-5">
        <h2 className="font-semibold text-text-primary dark:text-text-primary-dark mb-3">
          Quick Tips
        </h2>
        <ul className="text-sm text-text-secondary space-y-2">
          <li>
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
              Cmd+K
            </kbd>{" "}
            - Open command palette
          </li>
          <li>
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
              Double-click
            </kbd>{" "}
            - Quick connect to a server
          </li>
          <li>
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
              Right-click
            </kbd>{" "}
            - Context menu for server actions
          </li>
        </ul>
      </div>
    </div>
  );
}
