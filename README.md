# MIMO 2.5 — Kas Digital

Sistem pencatatan kas digital yang terintegrasi dengan Telegram untuk UMKM dan tim kecil.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (SSR)
- **Bot**: grammY (Telegram Bot Framework)
- **Language**: TypeScript (strict mode)

## Quick Start

```bash
# 1. Clone & install
pnpm install

# 2. Copy env
cp .env.local.example .env.local
# Fill in your Supabase and Telegram bot credentials

# 3. Run dev server
pnpm dev
```

## Project Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── api/
│   │   └── telegram/
│   │       └── webhook/
│   │           └── route.ts    # Telegram webhook endpoint
│   ├── categories/
│   │   └── page.tsx
│   ├── transactions/
│   │   └── page.tsx
│   ├── telegram/
│   │   └── page.tsx
│   ├── backups/
│   │   └── page.tsx
│   ├── settings/
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx              # Root layout (sidebar + bottom nav)
│   └── page.tsx                # Dashboard
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx         # Desktop sidebar navigation
│   │   ├── bottom-nav.tsx      # Mobile bottom navigation
│   │   └── top-bar.tsx         # Mobile top header
│   └── ui/
│       └── icons.tsx           # Inline SVG icon library
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser-side Supabase client
│   │   ├── server.ts           # Server-side Supabase client
│   │   └── middleware.ts       # Middleware Supabase client
│   ├── telegram/
│   │   └── bot.ts              # grammY bot + command handlers
│   └── utils.ts                # cn(), formatRupiah(), formatDate()
├── types/
│   └── database.ts             # TypeScript types for all DB tables
└── middleware.ts                # Next.js middleware (auth refresh)

supabase/
└── migrations/
    └── 00001_initial_schema.sql  # Full DDL + RLS policies
```

## Telegram Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message & user registration |
| `/connect` | Link Telegram account to system |
| `/tambah <nominal> <desc>` | Record a transaction |
| `/saldo` | Check current balance |

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | User profiles (web + Telegram) |
| `categories` | Transaction categories |
| `transactions` | All financial transactions |
| `telegram_links` | Telegram ↔ user mapping |
| `backups` | Backup history |
| `attachments` | Transaction file attachments |

## Environment Variables

See `.env.local.example` for the full list.

## License

Private — MIMO 2.5 Internal
# Kas-Digital
