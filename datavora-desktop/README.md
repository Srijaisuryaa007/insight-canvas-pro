# DataVora Desktop

Local-first AI desktop application powered by **Ollama**, **Tauri 2.0**, and **React 18**.
All chat happens on your machine — no API keys, no cloud, no telemetry.

## Features

- Streaming chat with any installed Ollama model
- Conversation memory persisted in SQLite (`conversations.db`)
- Model manager: install, delete, browse popular models
- Markdown + syntax-highlighted code in messages
- File attachments (txt, md, csv, json, source code)
- Dark, premium UI · Zustand state · keyboard shortcuts
- Cross-platform builds: `.exe` / `.msi` / `.dmg` / `.app` / `.deb` / `.AppImage`

## Prerequisites

1. **Rust** — https://rustup.rs
2. **Node.js 18+**
3. **Ollama** — https://ollama.ai/download
4. Pull at least one model:
   ```bash
   ollama serve            # starts the local API on :11434
   ollama pull llama3.2:3b
   ```

## Develop

```bash
cd datavora-desktop
npm install
npm run tauri:dev
```

## Production build

```bash
npm run tauri:build
```

Artifacts land in `src-tauri/target/release/bundle/`.

## Keyboard shortcuts

| Shortcut    | Action              |
|-------------|---------------------|
| `Ctrl+N`    | New conversation    |
| `Ctrl+K`    | Search conversations|
| `Ctrl+,`    | Open settings       |
| `Ctrl+M`    | Model manager       |
| `Esc`       | Cancel streaming    |
| `Ctrl+L`    | Clear chat          |

## Architecture

```
datavora-desktop/
├── src/                    React + TS frontend
│   ├── components/         Sidebar, Chat, ModelManager, Settings
│   ├── stores/             Zustand stores
│   ├── utils/ollama.ts     Streaming Ollama client
│   └── App.tsx
├── src-tauri/              Rust backend
│   ├── src/main.rs         Tauri entry + commands
│   └── tauri.conf.json
├── package.json
└── vite.config.ts
```
