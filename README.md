# OpenBalancer — AI Prompt Load Balancer

> **Multi-LLM Orchestration** — Intelligent prompt routing across Claude, GPT-4o, Gemini, and local models with automated fallback, cost optimization, and full audit logging.

Part of the **Wallestars Ecosystem** — built on n8n + Supabase + iOS Shortcuts.

---

## Features

- **6 routing strategies** — cost-optimized, lowest-latency, round-robin, quality-first, weighted, failover
- **4+ LLM providers** — Claude Sonnet/Opus, GPT-4o/mini, Gemini 2.5 Pro, Ollama (local)
- **Auto-fallback** — cascades through providers on error/rate-limit in &lt;100ms
- **Budget guard** — Supabase tracks daily spend; auto-downgrades to local when limit hit
- **Task classification** — routes code prompts to Deepseek-Coder, reasoning to Claude Opus, etc.
- **Dark/light mode** — respects `prefers-color-scheme`, toggleable, persisted via `localStorage`
- **Accessible** — skip link, ARIA labels, keyboard navigation, focus-visible styles, WCAG AA contrast
- **Responsive** — mobile-first, works from 375px (iPhone SE) to ultrawide

## Architecture

```
Client Layer  →  Gateway / Load Balancer  →  AI Model Layer  →  Data & Tools
iOS Shortcuts    n8n Webhook Router           Claude Sonnet 4     Supabase DB
Web App          OpenClaw Gateway :18789      Claude Opus 4       Redis Cache
Telegram Bot     Rate Limiter + Auth          GPT-4o              GitHub API
Discord          Strategy Selector            Gemini 2.5 Pro      Audit Logs
REST API         Cost Tracker                 Ollama (local)
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v22 or later
- npm dependencies installed with `npm install` or `npm ci`

### Run locally

```bash
# Clone the repository
git clone https://github.com/gabipetkova056-stack/openbalancer.git
cd openbalancer

# Start the static server
node server.js
# → Server running at http://localhost:3000

# Custom port
PORT=8080 node server.js
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### File structure

```
openbalancer/
├── index.html          # Landing page — all sections in sequence
├── style.css           # Design system + Clean Technical theme
├── script.js           # Theme toggle, counters, scroll reveal, mobile nav
├── server.js           # Zero-dependency Node.js static file server
├── dashboard.html      # React SPA entry point
├── vite.config.js      # Vite build config (base: /dashboard/)
├── package.json        # Node dependencies
├── src/
│   ├── main.jsx        # React 18 root
│   ├── App.jsx         # Shell: sidebar + header + view router
│   ├── store/
│   │   └── useStore.js # Zustand global state (docs, views, errors, toasts)
│   ├── lib/
│   │   ├── schema.js               # StandardizedDocument schema + utilities
│   │   ├── search.js               # Fuse.js fuzzy search index
│   │   └── parsers/
│   │       ├── claudeParser.js     # Claude conversations.json parser
│   │       ├── chatgptParser.js    # ChatGPT conversations.json parser
│   │       ├── genericParser.js    # Markdown / TXT / CSV fallback
│   │       ├── archiveExtractor.js # ZIP + TAR browser extractor
│   │       └── ingestionRouter.js  # Central routing + secret masking
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx         # Collapsible nav sidebar
│   │   │   └── Header.jsx          # Top bar with search shortcut
│   │   ├── ingestion/
│   │   │   └── Dropzone.jsx        # Drag-and-drop file import
│   │   ├── views/
│   │   │   ├── HomeView.jsx        # Upload + document list + stats
│   │   │   ├── ChatReplay.jsx      # Virtualized chat replay
│   │   │   ├── InsightsTimeline.jsx# Action items + decisions + code
│   │   │   ├── CrossReference.jsx  # Conflict detection across docs
│   │   │   └── ErrorLogView.jsx    # In-session error log
│   │   ├── search/
│   │   │   └── CommandPalette.jsx  # Cmd+K fuzzy search overlay
│   │   └── ui/
│   │       ├── ErrorBoundary.jsx   # Class-based error boundary
│   │       └── ToastContainer.jsx  # Slide-up notifications
│   └── styles/
│       └── globals.css             # Glassmorphism dark theme (800+ lines)
└── README.md
```

## Mission Control Dashboard

The `/dashboard` route runs a full **React 18 SPA** (built with Vite) that ingests AI conversation exports and renders them interactively — 100% in-browser, no data ever sent to any server.

### Features

| Feature | Details |
|---|---|
| **Universal file import** | Drop `.zip`, `.tar`, `.json`, `.md`, `.txt`, `.csv` — archives extracted in-browser with JSZip |
| **Multi-source parsers** | Auto-detects Claude `conversations.json`, ChatGPT exports, Markdown notes |
| **Chat Replay** | Virtualized message list, role avatars, collapsible long messages, code block copy |
| **Insights Timeline** | Extracted action items, decisions, and code blocks, filterable by type |
| **Invoice Parser** | In-browser invoice **text** extraction (vendor, dates, ДДС/VAT, ЕИК, total) for `.txt`/`.json`/`.csv` invoice text exports only, with CSV export. Binary/scanned PDFs go through n8n/Vision. See `docs/invoice-ocr/` |
| **Cross-Reference Engine** | Detects conflicts between MEMORY/TASKS/CALENDAR docs, overlap matrix |
| **Cmd+K Search** | Fuse.js fuzzy search across all loaded documents with keyboard navigation |
| **Error Boundaries** | Glassmorphism fallback UI for every major component, retry button |
| **Secret masking** | API keys and tokens are automatically redacted before parsing |
| **Zustand store** | Single source of truth; re-renders are minimal |
| **Glassmorphism UI** | Dark theme: `#0A0A0F` bg · `#6C9CFF` blue accent · 24px blur backdrops |

### Dashboard quick start

```bash
# Install dependencies
npm install

# Development server (hot-reload, port 5173)
npm run dev
# → http://localhost:5173/dashboard.html

# Production build (outputs to dist/)
npm run build

# Serve everything (landing page + built dashboard)
node server.js
# → Landing page:  http://localhost:3000/
# → Dashboard:     http://localhost:3000/dashboard
```

### Supported file formats

| Format | Parser | Notes |
|---|---|---|
| Claude `conversations.json` | `claudeParser.js` | Handles array or `{conversations:[]}` shape |
| ChatGPT `conversations.json` | `chatgptParser.js` | Traverses mapping tree |
| Markdown `.md` | `genericParser.js` | Extracts headings as metadata |
| Plain text `.txt` | `genericParser.js` | Paragraphs become messages |
| CSV `.csv` | `genericParser.js` | First row as headers, rows as messages |
| ZIP archive `.zip` | `archiveExtractor.js` | All contained files routed recursively |
| TAR archive `.tar` | `archiveExtractor.js` | Pure-JS parser, max 10MB per file |



**Theme:** Clean Technical  
**Colors:** `#F8F9FA` bg · `#6366F1` indigo primary · `#10B981` green accent  
**Fonts:** General Sans (display) · Inter (body) · JetBrains Mono (code)

## Deployment

The app is a fully static site — any static host works:

```bash
# Vercel
npx vercel

# Netlify
netlify deploy --dir .

# GitHub Pages
# Push to gh-pages branch or configure Pages to serve from main

# Self-hosted (Nginx)
server {
  listen 80;
  root /var/www/openbalancer;
  index index.html;
  try_files $uri $uri/ /index.html;
}
```

## Routing Strategies

| Strategy | Use Case |
|---|---|
| `cost-optimized` | High-volume batch jobs, non-critical tasks |
| `lowest-latency` | Real-time user-facing interactions |
| `round-robin` | Burst traffic, rate-limit avoidance |
| `quality-first` | Complex reasoning, flagship outputs |
| `weighted` | A/B testing, gradual model migrations |
| `failover` | Mission-critical with strict SLAs |

## Wallestars Ecosystem

| Project | Stack | Description |
|---|---|---|
| **Wallestars** | Claude AI, n8n, Supabase | AI automation & operations platform |
| **OpenClaw** | React 19, WebSocket | Autonomous agent command center |
| **RhythmClaw** | Python, MIDI | AI DJ controller (Telegram Mini App) |
| **Nano Banana** | Static HTML | AI-generated brand identity packs |
| **OpenBalancer** | Node.js, n8n | This project — Multi-LLM load balancer |

## License

MIT — see [LICENSE](LICENSE) for details.
