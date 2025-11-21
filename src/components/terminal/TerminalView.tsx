import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { useSessionStore } from "../../store/sessionStore";
import { useThemeStore } from "../../store/themeStore";

export default function TerminalView() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const { sessions, activeSessionId } = useSessionStore();
  const { resolvedTheme } = useThemeStore();
  const [isReady, setIsReady] = useState(false);

  const session = sessions.find(
    (s) => s.id === (sessionId || activeSessionId)
  );

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
    setIsReady(true);

    // Welcome message
    terminal.writeln("\x1b[1;36m╭──────────────────────────────────────────╮\x1b[0m");
    terminal.writeln("\x1b[1;36m│     StumpfWORKS Nexus Terminal           │\x1b[0m");
    terminal.writeln("\x1b[1;36m╰──────────────────────────────────────────╯\x1b[0m");
    terminal.writeln("");

    if (session) {
      terminal.writeln(`\x1b[33mConnecting to ${session.name}...\x1b[0m`);
    } else {
      terminal.writeln("\x1b[90mSelect a server from the sidebar to connect.\x1b[0m");
    }
    terminal.writeln("");

    // Handle resize
    const handleResize = () => {
      fit.fit();
    };
    window.addEventListener("resize", handleResize);

    // Handle input (demo echo)
    let inputBuffer = "";
    terminal.onData((data) => {
      if (data === "\r") {
        // Enter
        terminal.writeln("");
        if (inputBuffer.trim()) {
          // Echo command (placeholder for actual SSH)
          terminal.writeln(`\x1b[90m$ ${inputBuffer}\x1b[0m`);
          terminal.writeln(`Command "${inputBuffer}" would be sent to server.`);
        }
        inputBuffer = "";
        terminal.write("\x1b[32m❯\x1b[0m ");
      } else if (data === "\x7f") {
        // Backspace
        if (inputBuffer.length > 0) {
          inputBuffer = inputBuffer.slice(0, -1);
          terminal.write("\b \b");
        }
      } else {
        inputBuffer += data;
        terminal.write(data);
      }
    });

    terminal.write("\x1b[32m❯\x1b[0m ");

    return () => {
      window.removeEventListener("resize", handleResize);
      terminal.dispose();
    };
  }, [sessionId, activeSessionId]);

  // Update theme
  useEffect(() => {
    if (terminalInstance.current) {
      terminalInstance.current.options.theme =
        resolvedTheme === "dark" ? darkTheme : lightTheme;
    }
  }, [resolvedTheme]);

  return (
    <div className="h-full w-full bg-gray-900 dark:bg-black p-2">
      <div ref={terminalRef} className="h-full w-full" />
    </div>
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
