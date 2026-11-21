# ⚡ WikiStash — $0/Month Self-Updating AI Micro-Learning App

> **A Deepstash-style micro-learning web application engineered to operate 100% free forever ($0/month)** on free-tier infrastructure with **zero runtime database pausing** and unlimited visitor capacity.

[![Deploy to Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-4285F4?logo=google&logoColor=white)](https://aistudio.google.com/)
[![Cloudflare D1](https://img.shields.io/badge/Database-Cloudflare%20D1%20(SQLite)-orange?logo=sqlite&logoColor=white)](https://developers.cloudflare.com/d1/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

---

## 🏛️ Zero-Cost Architecture Blueprint

Most AI products incur ongoing monthly bills ($25/mo Supabase, $20/mo Vercel, $30/mo OpenAI) and suffer from inactivity pausing (Supabase and Neon pause free-tier DBs after 7 days of idle time). 

**WikiStash solves this through a zero-cost decoupled batch architecture:**

```
                                  DAILY INGESTION CRON (0 0 * * *)
                                     [GitHub Actions - 100% Free]
                                                 │
                                                 ▼
                             ┌──────────────────────────────────────┐
                             │ 1. Fetch 50 Wikipedia Candidates     │
                             │    (Filter: >450 words, non-disambig)│
                             └──────────────────┬───────────────────┘
                                                │
                                                ▼
                             ┌──────────────────────────────────────┐
                             │ 2. Batch Gemini 2.5 Flash            │
                             │    (2 concurrent reqs, 4s delay)     │
                             │    Structured ArticleDigest JSON     │
                             └──────────────────┬───────────────────┘
                                                │
                                                ▼
                             ┌──────────────────────────────────────┐
                             │ 3. Persist to Cloudflare D1 (SQLite) │
                             │    (Deduplicate by wikipedia_page_id)│
                             │    *NEVER PAUSES OR SLEEPS*          │
                             └──────────────────┬───────────────────┘
                                                │
                                                ▼
                             ┌──────────────────────────────────────┐
                             │ 4. Static Feed Export (latest.json)  │
                             │    Next.js Static Export (`out/`)    │
                             └──────────────────┬───────────────────┘
                                                │
                                                ▼
                             ┌──────────────────────────────────────┐
                             │ 5. Deploy to Cloudflare Pages CDN    │
                             │    Zero runtime DB calls per visitor │
                             │    Lightning-fast edge caching       │
                             └──────────────────────────────────────┘
```

### Free-Tier Cost Breakdown

| Component | Provider & Tier | Cost | Quota Used vs Free Limit |
|---|---|---|---|
| **Daily Ingestion** | GitHub Actions (`ubuntu-latest`) | **$0.00** | ~300 mins / 2,000 free runner mins/mo |
| **AI Summarization** | Google AI Studio (Gemini 2.5 Flash) | **$0.00** | Small batches of 2 reqs with 4s delay (well below 15 RPM) |
| **Persistent Storage** | Cloudflare D1 (Serverless SQLite) | **$0.00** | 1,500 writes/mo vs 100,000 free; 5GB storage; **0 pausing** |
| **Edge CDN Delivery** | Cloudflare Pages Static Hosting | **$0.00** | Static JSON export = **0 database reads per visitor** |
| **Monthly Total** | — | **$0.00** | **Unlimited visitors at $0/month** |

---

## ✨ Features (Deepstash-Style Micro-Learning)

- 💡 **High-Signal Idea Cards**: Dense Wikipedia articles transformed into 3 to 5 punchy idea cards with crisp insights and memorable mental model takeaways.
- ⚡ **Curiosity Hooks**: 1-sentence thought-provoking hooks that stop scrolling.
- 🎴 **Quick-Flip Flashcard Mode**: Fullscreen, distraction-free flashcard deck for rapid commute micro-learning with arrow keys / spacebar navigation.
- 🧠 **Interactive Comprehension Quizzes**: Instant knowledge check on each article with immediate feedback, answer explanations, and score tracking.
- ⭐ **My Stash (Bookmarks)**: Save individual idea cards or mental models to `localStorage`, with one-click export to Markdown (`.md`) or clipboard.
- 🔊 **Text-to-Speech Audio Reader**: Built-in speech synthesis so users can listen to mental models hands-free on mobile.
- 🔥 **Daily Streak & Goal Tracker**: Track days active and progress towards daily reading goals.
- 📚 **Historical Archive**: Browse past daily drops organized by date and category with instant client-side search.
- 🎨 **Category Styling**: Custom color themes for *Science & Tech*, *History & Culture*, *Psychology & Philosophy*, *Biography*, *Nature & Space*, and *Society & Economics*.

---

## 🚀 Quickstart & Local Development

WikiStash comes pre-seeded with **5 rich sample topics** in `public/data/latest.json`. It works immediately out of the box with zero external configuration!

### 1. Clone & Install
```bash
git clone https://github.com/your-username/wikistash.git
cd wikistash
pnpm install
```

### 2. Start Dev Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Data Pipeline & Ingestion Scripts

### Ingestion Commands

| Command | Description |
|---|---|
| `pnpm run ingest` | Runs the full daily ingestion (50 articles, Gemini summarization, D1 insert, static export) |
| `pnpm run ingest:dry-run` | Samples Wikipedia candidates and prints word counts without calling Gemini or writing to DB |
| `pnpm run ingest:mock` | Generates structured digests using mock generator (no Gemini API key required) |
| `pnpm run export:feed` | Re-exports `latest.json` and `archive-index.json` from D1 or local store |
| `pnpm run build` | Builds static Next.js export (`out/`) |

### Ingestion Arguments
```bash
# Ingest 5 articles for testing:
pnpm run ingest -- --limit=5

# Run dry run preview for 10 articles:
pnpm run ingest -- --dry-run --limit=10

# Test mock mode:
pnpm run ingest -- --mock --limit=3
```

---

## 🗄️ Setting Up Cloudflare D1 ($0/Month Database)

1. Install Wrangler and log in:
   ```bash
   npx wrangler login
   ```
2. Create your D1 SQLite database:
   ```bash
   npx wrangler d1 create wikistash-db
   ```
3. Copy the returned `database_id` into your `wrangler.toml` and `.env.local`:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "wikistash-db"
   database_id = "your-actual-database-uuid"
   ```
4. Execute the initial migration:
   ```bash
   npx wrangler d1 execute wikistash-db --file=migrations/0001_init.sql
   ```

---

## 🤖 Free Gemini AI Studio Configuration

1. Get a free API key at [Google AI Studio](https://aistudio.google.com/).
2. Add your key to `.env.local`:
   ```env
   GEMINI_API_KEY=AIzaSy...
   GEMINI_MODEL=gemini-2.5-flash
   ```

### Rate-Limit Guardrails
WikiStash implements strict free-tier rate-limit throttling in `scripts/lib/gemini.ts`:
- **Concurrency**: Small batches of **2 concurrent requests**.
- **Pacing**: **4-second sleep** between batches.
- **Backoff**: Automatic retry on `429` (Quota / Resource Exhausted) with exponential backoff (4s, 8s, 16s).

---

## 🌐 Deploying to GitHub Actions & Cloudflare Pages

### 1. GitHub Secrets
In your GitHub repository, go to **Settings > Secrets and variables > Actions** and add:
- `GEMINI_API_KEY`: Your Google AI Studio API key
- `CLOUDFLARE_API_TOKEN`: Cloudflare API Token (with D1 and Pages permissions)
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID
- `CLOUDFLARE_D1_DATABASE_ID`: Your D1 Database UUID

### 2. Daily Cron
The workflow `.github/workflows/daily-ingest.yml` runs automatically every night at `00:00 UTC`:
1. Ingests 50 fresh Wikipedia articles.
2. Summarizes them with Gemini.
3. Inserts into Cloudflare D1 with deduplication.
4. Generates static Next.js export in `out/`.
5. Deploys static build to Cloudflare Pages.

---

## 📂 Project Structure

```
wikistash/
├── .github/workflows/
│   └── daily-ingest.yml          # GitHub Actions cron & deploy workflow
├── app/
│   ├── globals.css               # Dark theme, glassmorphism, scrollbars
│   ├── layout.tsx                # Metadata & font setup
│   └── page.tsx                  # Main app page & view switcher
├── components/
│   ├── ArchitectureModal.tsx     # $0/mo stack breakdown & cost table
│   ├── ArchiveView.tsx           # Historical archive browser
│   ├── ArticleCard.tsx           # Deepstash card with idea carousel & quiz
│   ├── Navbar.tsx                # Header, search, streak & goals
│   ├── QuickFlipDeck.tsx         # Fullscreen flashcard flip mode
│   └── StashDrawer.tsx           # Bookmarked cards with Markdown export
├── lib/
│   ├── category-styles.ts        # Category badges, colors, and borders
│   ├── storage.ts                # LocalStorage for streak, stash, and quizzes
│   └── types.ts                  # Shared TypeScript interfaces
├── migrations/
│   └── 0001_init.sql             # Cloudflare D1 SQLite database schema
├── public/data/
│   ├── archive-index.json        # Historical index for static CDN delivery
│   └── latest.json               # Pre-seeded 5 rich topics for instant dev
├── scripts/
│   ├── lib/
│   │   ├── d1.ts                 # D1 HTTP API & local Wrangler executor
│   │   ├── gemini.ts             # Gemini SDK + rate-limit guardrails
│   │   ├── types.ts              # Ingestion schema types
│   │   └── wikipedia.ts          # REST & Action API quality filters
│   ├── export-feed.ts            # D1 static feed exporter
│   └── ingest-daily.ts           # Main daily ingestion runner
├── next.config.mjs               # Static export (`output: 'export'`)
├── tailwind.config.ts            # Custom colors & typography
├── wrangler.toml                 # Cloudflare D1 binding template
└── package.json
```

---

## 📄 License
MIT License. Built with ❤️ for zero-cost lifelong learners.
