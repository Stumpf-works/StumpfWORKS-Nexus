import { useNavigate, useLocation } from "react-router-dom";
import {
  Terminal,
  FolderOpen,
  Code2,
  Settings,
  Search,
} from "lucide-react";
import { useCommandPaletteStore } from "../../store/commandPaletteStore";

export default function TitleBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { open } = useCommandPaletteStore();

  const navItems = [
    { path: "/terminal", icon: Terminal, label: "Terminal" },
    { path: "/sftp", icon: FolderOpen, label: "SFTP" },
    { path: "/snippets", icon: Code2, label: "Snippets" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="h-12 bg-sidebar dark:bg-sidebar-dark border-b border-border dark:border-border-dark flex items-center justify-between px-4 drag">
      {/* Traffic lights spacer (macOS) */}
      <div className="w-20 flex-shrink-0" />

      {/* Center navigation */}
      <div className="flex items-center gap-1 no-drag">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
                transition-all
                ${
                  isActive
                    ? "bg-gray-200 dark:bg-gray-700 text-text-primary dark:text-text-primary-dark"
                    : "text-text-secondary dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-800"
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search button */}
      <div className="w-20 flex justify-end no-drag">
        <button
          onClick={open}
          className="flex items-center gap-2 px-3 py-1.5 text-text-secondary dark:text-text-secondary-dark
                     hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm"
        >
          <Search className="w-4 h-4" />
          <kbd className="hidden sm:inline text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
        </button>
      </div>
    </div>
  );
}
