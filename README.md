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

- [Node.js](https://nodejs.org/) v18 or later (no npm packages required)

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
├── index.html   # Main page — all sections in sequence
├── style.css    # Design system + Clean Technical theme
├── script.js    # Theme toggle, counters, scroll reveal, mobile nav
├── server.js    # Zero-dependency Node.js static file server
└── README.md    # This file
```

## Design System

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
