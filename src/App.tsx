import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useThemeStore } from "./store/themeStore";
import MainLayout from "./components/layout/MainLayout";
import Dashboard from "./components/pages/Dashboard";
import TerminalView from "./components/terminal/TerminalView";
import SftpExplorer from "./components/sftp/SftpExplorer";
import SnippetManager from "./components/snippets/SnippetManager";
import VaultView from "./components/vault/VaultView";
import Settings from "./components/settings/Settings";
import CommandPalette from "./components/command-palette/CommandPalette";
import { ToastContainer } from "./components/ui/Toast";

function App() {
  const { theme, initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <div className="h-screen w-screen overflow-hidden bg-[#0A0A0F]">
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/terminal/:sessionId?" element={<TerminalView />} />
            <Route path="/sftp/:sessionId?" element={<SftpExplorer />} />
            <Route path="/vault" element={<VaultView />} />
            <Route path="/snippets" element={<SnippetManager />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </MainLayout>
        <CommandPalette />
        <ToastContainer />
      </div>
    </BrowserRouter>
  );
}

export default App;
