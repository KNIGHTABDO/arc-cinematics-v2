# ARC Cinematics v2.0 — Scorched Earth

Next-generation serverless streaming platform. Rebuilt from zero on Next.js 15 App Router + Edge Runtime + Supabase + Real-Debrid BYOD.

## Architecture

- **Framework**: Next.js 15 App Router (`src/app/`)
- **Runtime**: Vercel Edge Functions (`export const runtime = "edge"`)
- **Player**: Native HTML5 video with custom controls (play/pause/seek/volume/fullscreen/CC/quality picker)
- **Data**: Supabase PostgreSQL
- **Auth**: Supabase Auth (email/password)
- **Streaming**: Bring-Your-Own-Debrid via Real-Debrid
- **Metadata**: TMDB API

## Pages

| Route | Description |
|-------|-------------|
| `/` | Auto-redirects to login or profiles |
| `/login` | Sign in |
| `/register` | Create account |
| `/profiles` | "Who's Watching?" — select or manage profiles |
| `/browse` | Home with hero banner + content rows (movies + TV) |
| `/browse?type=movies` | Movies only |
| `/browse?type=tv` | TV only |
| `/title/[id]` | Movie detail page with cast, crew, similar |
| `/tv/[id]` | TV show detail with season/episode grid |
| `/stream/[id]` | **Player** — movie playback |
| `/stream/tv-X-sYeZ` | **Player** — TV episode playback |
| `/search?q=...` | Search movies + TV |
| `/settings` | BYOD token, quality, subtitle language |

## Edge API Routes

- `GET /api/stream/resolve?tmdbId=&type=` — Resolve streams via Torrentio, score, cache in Supabase
- `POST /api/stream/unrestrict` — Unrestrict magnet using user's RD token
- `GET /api/subtitles/proxy?tmdbId=&lang=` — CORS-safe subtitle proxy (SRT→VTT)
- `GET|POST /api/playback/history` — Resume position persistence

## Database Schema

Run these SQL files in your Supabase SQL Editor (in order):

1. `supabase/migrations/20260423000000_init_streaming_schema.sql`
   - `streams_cache` — 24h torrent result cache
   - `user_preferences` — BYOD token + quality/language prefs
   - `playback_history` — Resume timestamp tracking
   - `subtitle_index` — Converted VTT cache
   - `source_scores` — Stream reliability analytics
   - `device_capability_rules` — Client compatibility rules

2. `supabase/migrations/20260423000001_add_profiles.sql`
   - `profiles` — Multi-profile support (Who's Watching)
   - RLS policies for security

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# TMDB (get from https://www.themoviedb.org/settings/api)
NEXT_PUBLIC_TMDB_API_KEY=your-tmdb-key
TMDB_API_KEY=your-tmdb-key

# Real-Debrid (global fallback token)
REAL_DEBRID_TOKEN=your-rd-token
VITE_REAL_DEBRID_TOKEN=your-rd-token
```

> **Your RD token is already saved in `.env.local` and gitignored.**

## Supabase Setup (New Project)

1. Go to [supabase.com](https://supabase.com) → New Project → name it `arc-cinematics-v2`
2. In SQL Editor, run both migration files from `supabase/migrations/`
3. Go to Project Settings → API → copy URL and anon/service_role keys
4. Add them to Vercel environment variables

## Deployment

```bash
vercel --prod
```

## Development

```bash
npm install --legacy-peer-deps
npm run dev
```

## Features

- ✅ Multi-profile support with avatar selection
- ✅ Kids profile filtering
- ✅ Hero banner with backdrop + gradient overlays
- ✅ Horizontal content rows with drag-to-scroll
- ✅ Movie + TV detail pages
- ✅ Search with multi-type results
- ✅ Resume playback (save every 10s)
- ✅ Next-episode countdown at 95% progress
- ✅ Quality stream picker (switches Real-Debrid files)
- ✅ Subtitle toggle (Arabic default)
- ✅ Error recovery with fallback ladder
- ✅ BYOD token per user
- ✅ 24h streams cache
- ✅ iOS/MKV penalty in scoring engine
- ✅ Serverless Edge runtime — zero cold starts

## Old Version

The previous TanStack Start version is preserved at:
`../arc-cinematics-showcase-backup-2026-04-23`
