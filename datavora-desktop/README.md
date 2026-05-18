# DataVora Desktop

Local AI assistant powered by Ollama. 100% private. No data leaves your machine.

## Prerequisites

1. **Rust** — https://rustup.rs
2. **Node.js 18+** — https://nodejs.org
3. **Ollama** — https://ollama.ai/download

## Quick Start

```bash
# Install Ollama, then start it
ollama serve

# Pull a model in another terminal
ollama pull llama3.2:3b

# Install Tauri CLI globally
npm install -g @tauri-apps/cli

# Inside this folder
npm install
npm run tauri:dev
```

## Build for Production

```bash
npm run tauri:build
```

Bundles are written to `src-tauri/target/release/bundle/`:

- Windows: `bundle/msi/*.msi`
- macOS:   `bundle/dmg/*.dmg`
- Linux:   `bundle/deb/*.deb`, `bundle/appimage/*.AppImage`

## Features

- 💬 Chat with any Ollama model with streaming responses
- 📁 Attach files (txt, pdf, csv, code, json, yaml, and many more)
- 🗃 Full conversation history in SQLite (or localStorage fallback)
- ⬇️ Built-in model download and management
- ⚙️ Configurable temperature, context window, system prompt, threads
- 🌙 Dark / Light / System theme
- ⌨️ Full keyboard shortcuts (Ctrl+N, Ctrl+K, Ctrl+,, Ctrl+M, Esc, …)

## Architecture

- **Frontend**: React 18 + Vite 5 + TypeScript + Tailwind 3 + Zustand
- **Backend**: Tauri 2 (Rust) with `tauri-plugin-sql`, `tauri-plugin-shell`, `tauri-plugin-fs`
- **AI**: Ollama HTTP API at `http://localhost:11434`
- **Persistence**: SQLite via Tauri plugin; transparent localStorage fallback when running outside the desktop shell or before the plugin loads.

## License

MIT
