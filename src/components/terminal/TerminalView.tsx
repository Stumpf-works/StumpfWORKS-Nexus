import { useEffect, useRef, useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "@xterm/xterm/css/xterm.css";
import { useSessionStore } from "../../store/sessionStore";
import { useThemeStore } from "../../store/themeStore";
import { useHostStore } from "../../store/hostStore";
import PasswordDialog from "../ui/PasswordDialog";

interface TerminalEvent {
  type: "Data" | "Connected" | "Disconnected" | "Error" | "Latency";
  data?: string | number;
}

export default function TerminalView() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const { sessions, activeSessionId, updateSessionStatus } = useSessionStore();
  const { hosts, updateHost } = useHostStore();
  const { resolvedTheme } = useThemeStore();

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<any>(null);
  const hasConnectedRef = useRef<string | null>(null);
  const connectHostRef = useRef<(() => Promise<void>) | null>(null);

  const currentSessionId = sessionId || activeSessionId;
  const session = sessions.find((s) => s.id === currentSessionId);
  const host = session ? hosts.find((h) => h.id === session.host_id) : null;

  // Write data to terminal backend
  const writeToBackend = useCallback(async (data: string) => {
    if (!currentSessionId) return;
    try {
      await invoke("write_terminal", { sessionId: currentSessionId, data });
    } catch (error) {
      console.error("Failed to write to terminal:", error);
    }
  }, [currentSessionId]);

  // Resize terminal backend
  const resizeBackend = useCallback(async (cols: number, rows: number) => {
    if (!currentSessionId) return;
    try {
      await invoke("resize_terminal", { sessionId: currentSessionId, cols, rows });
    } catch (error) {
      console.error("Failed to resize terminal:", error);
    }
  }, [currentSessionId]);

  // Actually connect with credentials
  const doConnect = useCallback(async (password?: string, keyPath?: string, passphrase?: string) => {
    const currentHost = host;
    if (!currentSessionId || !currentHost) return;

    const terminal = terminalInstance.current;
    if (!terminal) return;

    terminal.writeln(`\x1b[33mConnecting to ${currentHost.name}...\x1b[0m`);

    try {
      await invoke("connect_terminal", {
        sessionId: currentSessionId,
        host: currentHost.hostname,
        port: currentHost.port,
        username: currentHost.username,
        authType: currentHost.auth_type,
        password: password || null,
        keyPath: keyPath || null,
        passphrase: passphrase || null,
      });

      updateSessionStatus(currentSessionId, "connected");
      terminal.writeln(`\x1b[32mConnected to ${currentHost.name}\x1b[0m`);
      terminal.writeln("");
    } catch (error) {
      updateSessionStatus(currentSessionId, "error");
      terminal.writeln(`\x1b[31mConnection failed: ${error}\x1b[0m`);
    }
  }, [currentSessionId, host?.id, updateSessionStatus]);

  // Connect to SSH
  const connectToHost = useCallback(async () => {
    const currentHost = host;
    if (!currentSessionId || !currentHost) return;

    // Check if we have stored credentials
    if (currentHost.auth_type === "password" && currentHost.password) {
      // Use stored password
      await doConnect(currentHost.password);
    } else if (currentHost.auth_type === "private_key" && currentHost.private_key) {
      // Use stored private key
      await doConnect(undefined, currentHost.private_key, currentHost.passphrase || undefined);
    } else if (currentHost.auth_type === "agent") {
      // SSH agent doesn't need credentials
      await doConnect();
    } else {
      // No stored credentials, show password dialog
      setPendingConnection({ host: currentHost, sessionId: currentSessionId });
      setShowPasswordDialog(true);
    }
  }, [currentSessionId, host?.id, host?.auth_type, host?.password, host?.private_key, host?.passphrase, doConnect]);

  // Store connect function in ref
  connectHostRef.current = connectToHost;

  // Handle password dialog submit
  const handlePasswordSubmit = useCallback(async (password: string, remember: boolean) => {
    if (!pendingConnection) return;

    setShowPasswordDialog(false);

    const { host, sessionId } = pendingConnection;

    // Save password if requested
    if (remember && host) {
      try {
        await updateHost({
          ...host,
          password: host.auth_type === "password" ? password : null,
          passphrase: host.auth_type === "private_key" ? password : null,
        });
      } catch (error) {
        console.error("Failed to save credentials:", error);
      }
    }

    // Connect with provided password
    if (host.auth_type === "password") {
      await doConnect(password);
    } else if (host.auth_type === "private_key") {
      await doConnect(undefined, host.private_key || undefined, password);
    }

    setPendingConnection(null);
  }, [pendingConnection, doConnect, updateHost]);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      fontFamily: '"SF Mono", Menlo, Monaco, "Cascadia Code", Consolas, monospace',
      fontSize: 14,
      lineHeight: 1.2,
      theme: resolvedTheme === "dark" ? darkTheme : lightTheme,
      allowProposedApi: true,
    });

    // Add addons
    const fit = new FitAddon();
    const webLinks = new WebLinksAddon();
    terminal.loadAddon(fit);
    terminal.loadAddon(webLinks);

    // Mount terminal
    terminal.open(terminalRef.current);
    fit.fit();

    // Store references
    terminalInstance.current = terminal;
    fitAddon.current = fit;

    // Welcome message
    terminal.writeln("\x1b[1;36m╭──────────────────────────────────────────╮\x1b[0m");
    terminal.writeln("\x1b[1;36m│     StumpfWORKS Nexus Terminal           │\x1b[0m");
    terminal.writeln("\x1b[1;36m╰──────────────────────────────────────────╯\x1b[0m");
    terminal.writeln("");

    if (!session) {
      terminal.writeln("\x1b[90mSelect a server from the sidebar to connect.\x1b[0m");
      terminal.writeln("");
    }

    // Handle resize
    const handleResize = () => {
      fit.fit();
      const dims = fit.proposeDimensions();
      if (dims) {
        resizeBackend(dims.cols, dims.rows);
      }
    };
    window.addEventListener("resize", handleResize);

    // Handle input - send to backend
    terminal.onData((data) => {
      writeToBackend(data);
    });

    // Initial resize
    const dims = fit.proposeDimensions();
    if (dims) {
      resizeBackend(dims.cols, dims.rows);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      terminal.dispose();
    };
  }, [resolvedTheme]); // Only recreate on theme change

  // Listen for terminal data from backend
  useEffect(() => {
    if (!currentSessionId) return;

    const eventName = `terminal-data-${currentSessionId}`;

    const unlisten = listen<TerminalEvent>(eventName, (event) => {
      const terminal = terminalInstance.current;
      if (!terminal) return;

      const payload = event.payload;

      switch (payload.type) {
        case "Data":
          if (typeof payload.data === "string") {
            terminal.write(payload.data);
          }
          break;
        case "Connected":
          updateSessionStatus(currentSessionId, "connected");
          break;
        case "Disconnected":
          updateSessionStatus(currentSessionId, "disconnected");
          terminal.writeln("\r\n\x1b[33mDisconnected from server.\x1b[0m");
          break;
        case "Error":
          updateSessionStatus(currentSessionId, "error");
          if (typeof payload.data === "string") {
            terminal.writeln(`\r\n\x1b[31mError: ${payload.data}\x1b[0m`);
          }
          break;
        case "Latency":
          // Could update latency display
          break;
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [currentSessionId, updateSessionStatus]);

  // Auto-connect when session and host are available (only once)
  useEffect(() => {
    if (!session || !host) {
      return;
    }

    // Only connect once per unique session
    const sessionKey = `${session.id}-${host.id}`;
    if (session.status === "disconnected" && hasConnectedRef.current !== sessionKey) {
      hasConnectedRef.current = sessionKey;
      connectHostRef.current?.();
    }
  }, [session?.id, host?.id, session?.status]);

  // Update theme
  useEffect(() => {
    if (terminalInstance.current) {
      terminalInstance.current.options.theme =
        resolvedTheme === "dark" ? darkTheme : lightTheme;
    }
  }, [resolvedTheme]);

  return (
    <>
      <div className="h-full w-full bg-gray-900 dark:bg-black p-2">
        <div ref={terminalRef} className="h-full w-full" />
      </div>

      {/* Password Dialog */}
      {host && (
        <PasswordDialog
          isOpen={showPasswordDialog}
          onClose={() => {
            setShowPasswordDialog(false);
            setPendingConnection(null);
          }}
          onSubmit={handlePasswordSubmit}
          authType={host.auth_type}
          hostname={host.hostname}
          username={host.username}
        />
      )}
    </>
  );
}

const darkTheme = {
  background: "#1a1a1a",
  foreground: "#e5e5e5",
  cursor: "#ffffff",
  cursorAccent: "#1a1a1a",
  selectionBackground: "#3a3a3a",
  black: "#000000",
  red: "#ff5555",
  green: "#50fa7b",
  yellow: "#f1fa8c",
  blue: "#6272a4",
  magenta: "#ff79c6",
  cyan: "#8be9fd",
  white: "#f8f8f2",
  brightBlack: "#6272a4",
  brightRed: "#ff6e6e",
  brightGreen: "#69ff94",
  brightYellow: "#ffffa5",
  brightBlue: "#d6acff",
  brightMagenta: "#ff92df",
  brightCyan: "#a4ffff",
  brightWhite: "#ffffff",
};

const lightTheme = {
  background: "#ffffff",
  foreground: "#24292e",
  cursor: "#24292e",
  cursorAccent: "#ffffff",
  selectionBackground: "#c8c8fa",
  black: "#24292e",
  red: "#d73a49",
  green: "#22863a",
  yellow: "#b08800",
  blue: "#0366d6",
  magenta: "#6f42c1",
  cyan: "#1b7c83",
  white: "#6a737d",
  brightBlack: "#959da5",
  brightRed: "#cb2431",
  brightGreen: "#28a745",
  brightYellow: "#dbab09",
  brightBlue: "#2188ff",
  brightMagenta: "#8a63d2",
  brightCyan: "#3192aa",
  brightWhite: "#d1d5da",
};
