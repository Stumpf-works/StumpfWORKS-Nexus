# StumpfWORKS Nexus

<div align="center">
  <img src="assets/nexus-logo.svg" alt="Nexus Logo" width="120" />
  <h3>Modern SSH, SFTP & DevOps Tool</h3>
  <p>A beautiful, fast, and secure terminal client with macOS-inspired design</p>
</div>

---

## Features

### Core Functionality
- **Multi-Session Terminal** - Connect to multiple servers simultaneously with tabbed interface
- **SFTP Explorer** - Full-featured file browser with drag & drop support
- **Snippet Manager** - Save and organize frequently used commands
- **Command Palette** - Quick access to all features (Cmd/Ctrl+K)

### UI/UX
- **macOS-Inspired Design** - Beautiful blurred surfaces, rounded corners, smooth animations
- **Dark/Light Mode** - Automatic theme switching with system preference support
- **Resizable Sidebar** - Organize your servers into groups with custom colors and icons
- **Real-time Latency** - Connection quality monitoring with latency graphs

### Security
- **DataSphere** - End-to-end encrypted storage for:
  - Host configurations
  - SSH private keys
  - Snippets
  - Application settings
- **Encryption** - AES-256-GCM via libsodium (planned)
- **Optional Sync** - Self-hosted synchronization (WebDAV, S3, Nextcloud)

### MCP Server Integration
Built-in local MCP (Model Context Protocol) server for AI integrations:

```yaml
abilities:
  - nexus.server.list      # List configured servers
  - nexus.ssh.connect      # Establish SSH connection
  - nexus.ssh.execute      # Execute commands remotely
  - nexus.ssh.upload       # Upload files via SFTP
  - nexus.ssh.download     # Download files via SFTP
  - nexus.datasphere.get   # Read from encrypted storage
  - nexus.datasphere.set   # Write to encrypted storage
  - nexus.logs.stream      # Stream session logs
  - nexus.ai.invoke        # Invoke local AI (Ollama)
```

Supported AI Providers:
- Claude (Anthropic)
- ChatGPT (OpenAI)
- Ollama (Local)

All AI actions require explicit user permission.

### Plugin System
Extend Nexus with custom plugins for additional functionality.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Framework | [Tauri 2.0](https://tauri.app/) |
| Backend | Rust |
| SSH/SFTP | russh (planned) |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS |
| UI Components | Radix UI |
| Terminal | xterm.js |
| State Management | Zustand |
| Routing | React Router |

---

## Project Structure

```
StumpfWORKS-Nexus/
├── src/                    # React Frontend
│   ├── components/         # UI Components
│   │   ├── layout/         # App layout (MainLayout, TitleBar, TabBar)
│   │   ├── sidebar/        # Server sidebar
│   │   ├── terminal/       # Terminal emulator
│   │   ├── sftp/           # SFTP file explorer
│   │   ├── settings/       # Settings UI
│   │   ├── snippets/       # Snippet manager
│   │   ├── command-palette/# Quick command access
│   │   └── pages/          # Page components
│   ├── store/              # Zustand stores
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── types/              # TypeScript types
│   └── styles/             # Global styles
├── src-tauri/              # Rust Backend
│   └── src/
│       ├── ssh/            # SSH client implementation
│       ├── sftp/           # SFTP operations
│       ├── datasphere/     # Encrypted storage
│       ├── session/        # Session management
│       ├── mcp/            # MCP server for AI
│       ├── plugins/        # Plugin system
│       └── utils/          # Utility functions
├── plugins/                # Plugin templates
├── docs/                   # Documentation
└── assets/                 # Branding, icons
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Rust** 1.70+
- **Platform-specific dependencies:**
  - **macOS:** Xcode Command Line Tools
  - **Windows:** Visual Studio Build Tools, WebView2
  - **Linux:** Various system libraries (see Tauri docs)

### Installation

```bash
# Clone the repository
git clone https://github.com/Stumpf-works/StumpfWORKS-Nexus.git
cd StumpfWORKS-Nexus

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

---

## Development

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build frontend |
| `npm run tauri dev` | Run Tauri in development |
| `npm run tauri build` | Build production app |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │Terminal │  │  SFTP   │  │Settings │  │Snippets │    │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │
│       │            │            │            │          │
│       └────────────┴────────────┴────────────┘          │
│                         │                                │
│                   Tauri IPC                              │
│                         │                                │
└─────────────────────────┼───────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────┐
│                    Rust Backend                          │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌─────────┐   │
│  │   SSH   │  │  SFTP   │  │DataSphere│  │   MCP   │   │
│  └─────────┘  └─────────┘  └──────────┘  └─────────┘   │
│                                              │          │
│                                         ┌────┴────┐     │
│                                         │Claude/  │     │
│                                         │ChatGPT/ │     │
│                                         │Ollama   │     │
│                                         └─────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

## Roadmap

- [ ] SSH connection implementation (russh)
- [ ] SFTP file operations
- [ ] DataSphere encryption (libsodium)
- [ ] MCP server HTTP/WebSocket
- [ ] Plugin marketplace
- [ ] AI assistant integration
- [ ] Audit logging
- [ ] Cross-device sync

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">
  <p>Built with ❤️ by <a href="https://stumpf.works">Stumpf-works</a></p>
</div>
