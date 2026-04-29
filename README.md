# open-files

Minimal, sleek, cross-platform document viewer for PDF, Markdown, JSON, Text, Mermaid, and EPUB.

Built with Tauri v2 + React + TypeScript + Vite.

## Supported Formats

| Format   | Extensions                              | Renderer           |
| -------- | --------------------------------------- | ------------------- |
| PDF      | `.pdf`                                  | pdfjs-dist          |
| Markdown | `.md`, `.markdown`                      | @create-markdown/core + preview |
| Mermaid  | `.mmd`, `.mermaid`                      | @create-markdown/preview-mermaid |
| JSON     | `.json`                                 | Pretty-print with error display |
| Text     | `.txt`, `.log`, `.csv`, `.yaml`, `.toml`, `.xml`, etc. | Preformatted viewer |
| EPUB     | `.epub`                                 | epubjs              |

## Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (v8+)
- [Rust](https://rustup.rs/) (for Tauri native builds)
- Xcode Command Line Tools (macOS) or equivalent platform toolchain

## Getting Started

```bash
# Install dependencies
pnpm install

# Run in browser (dev mode, no Tauri shell)
pnpm dev
# Open http://localhost:1420

# Run as native desktop app (requires Rust toolchain)
pnpm tauri:dev

# Build native app bundle
pnpm tauri:build

# Initialize mobile projects when the local toolchains are installed
pnpm tauri:ios:init
pnpm tauri:android:init
```

## Scripts

| Command           | Description                              |
| ----------------- | ---------------------------------------- |
| `pnpm dev`        | Start Vite dev server (browser mode)     |
| `pnpm build`      | TypeScript check + Vite production build |
| `pnpm preview`    | Preview production build                 |
| `pnpm typecheck`  | TypeScript type checking only            |
| `pnpm test`       | Run unit tests with Vitest               |
| `pnpm secrets:scan` | Scan tracked and untracked source files for common secret patterns |
| `pnpm setup:hooks` | Enable the repository pre-commit hook locally |
| `pnpm tauri:dev`  | Launch Tauri desktop app in dev mode     |
| `pnpm tauri:build`| Build native desktop app bundle          |
| `pnpm tauri:ios:init` | Generate the iOS target project      |
| `pnpm tauri:ios:dev` | Launch on iOS simulator/device        |
| `pnpm tauri:ios:build` | Build the iOS app                  |
| `pnpm tauri:android:init` | Generate the Android target project |
| `pnpm tauri:android:dev` | Launch on Android emulator/device  |
| `pnpm tauri:android:build` | Build the Android app            |

## Secret Safety

This repo intentionally ignores local env files, signing material, credentials, and build artifacts. The committed pre-commit hook runs `node scripts/secret-scan.mjs` to block common API keys, private key blocks, and credential assignments before commit.

`pnpm install` enables `.githooks/` automatically via the `prepare` script. If hooks are not active, run:

```bash
pnpm setup:hooks
pnpm secrets:scan
```

GitHub Actions also runs the same secret scan on pushes and pull requests.

## Architecture

```
open-files/
  index.html              # Vite entry
  src/
    main.tsx              # React mount
    App.tsx               # Main app shell (header, drop zone, routing)
    fileTypes.ts          # File extension detection
    useFileLoader.ts      # File loading (Tauri native or browser fallback)
    renderMarkdown.ts     # Markdown/Mermaid rendering pipeline with DOMPurify
    styles.css            # System-aware light/dark theme
    viewers/
      PdfViewer.tsx       # PDF rendering with pdfjs-dist
      MarkdownViewer.tsx  # Markdown with @create-markdown/preview
      MermaidViewer.tsx   # Mermaid via fenced code block rendering
      JsonViewer.tsx      # JSON pretty-print with error handling
      TextViewer.tsx      # Plain text / log / CSV viewer
      EpubViewer.tsx      # EPUB reader with navigation
    __tests__/
      fileTypes.test.ts   # File type detection tests
  src-tauri/
    src/                  # Rust backend (Tauri plugins)
    tauri.conf.json       # Tauri v2 configuration
    capabilities/         # Tauri v2 permission capabilities
    Cargo.toml            # Rust dependencies
```

## Features

- Single-window UI with clean empty state and unsupported-format messaging
- Open files via native dialog (Tauri) or browser file picker (dev mode)
- Drag and drop file loading
- File metadata display (name, size, format)
- System-aware light/dark theme (follows OS preference)
- PDF page navigation
- EPUB chapter navigation

## Release Targets

open-files uses Tauri v2 so the same React/TypeScript interface can be packaged for macOS, Windows, Linux, iOS, and Android. Desktop builds are ready from this scaffold. Mobile targets are initialized with the scripts above once Xcode/iOS and Android SDK/JDK prerequisites are installed on the release machine.

## Known Limitations

- Markdown renders Mermaid fenced code blocks via @create-markdown/preview-mermaid
- EPUB rendering depends on epubjs which has limited CSS support for complex layouts
- PDF worker is bundled inline; large PDFs may be slow on first render
- No file watching or auto-reload on external changes
- No search within documents
- No print support
- Browser dev mode uses `<input type="file">` fallback instead of native dialog
- Android builds require a Java runtime plus Android SDK tooling; those are not bundled with this repo

## License

MIT
