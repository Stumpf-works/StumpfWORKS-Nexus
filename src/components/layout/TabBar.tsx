import { X, Plus } from "lucide-react";
import { useSessionStore } from "../../store/sessionStore";
import { useNavigate } from "react-router-dom";

export default function TabBar() {
  const { sessions, activeSessionId, setActiveSession, closeSession } =
    useSessionStore();
  const navigate = useNavigate();

  if (sessions.length === 0) {
    return null;
  }

  const handleTabClick = (sessionId: string) => {
    setActiveSession(sessionId);
    navigate(`/terminal/${sessionId}`);
  };

  const handleCloseTab = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    closeSession(sessionId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-success";
      case "connecting":
      case "reconnecting":
        return "bg-warning animate-pulse";
      case "error":
        return "bg-error";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div className="h-9 bg-sidebar dark:bg-sidebar-dark border-b border-border dark:border-border-dark flex items-center gap-1 px-2 overflow-x-auto">
      {sessions.map((session) => (
        <button
          key={session.id}
          onClick={() => handleTabClick(session.id)}
          className={`
            group flex items-center gap-2 px-3 py-1 rounded-md text-sm
            transition-all min-w-0 max-w-[200px]
            ${
              activeSessionId === session.id
                ? "bg-white dark:bg-gray-800 shadow-sm"
                : "hover:bg-gray-200 dark:hover:bg-gray-700"
            }
          `}
        >
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(session.status)}`} />
          <span className="truncate text-text-primary dark:text-text-primary-dark">
            {session.name}
          </span>
          {session.latency_ms !== null && (
            <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
              {session.latency_ms}ms
            </span>
          )}
          <button
            onClick={(e) => handleCloseTab(e, session.id)}
            className="opacity-0 group-hover:opacity-100 hover:bg-gray-300 dark:hover:bg-gray-600 rounded p-0.5 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </button>
      ))}

      {/* New tab button */}
      <button
        onClick={() => navigate("/")}
        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
        title="New connection"
      >
        <Plus className="w-4 h-4 text-text-secondary" />
      </button>
    </div>
  );
}
