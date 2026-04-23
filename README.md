# ARC Cinematics

Next-generation serverless streaming platform built on Next.js 15 App Router + Supabase + Real-Debrid BYOD.

## Architecture

- **Framework**: Next.js 15 App Router with Edge Runtime
- **Player**: Vidstack (MSE/HLS/DASH normalization)
- **Backend**: Vercel Edge Functions (zero cold-start V8 isolates)
- **Data**: Supabase PostgreSQL with comprehensive caching layer
- **Streaming**: Bring-Your-Own-Debrid (BYOD) via Real-Debrid

## Edge API Routes

- `GET /api/stream/resolve?tmdbId=&type=` — Resolve & score streams
- `POST /api/stream/unrestrict` — Unrestrict magnet via user's RD token
- `GET /api/subtitles/proxy?tmdbId=&lang=` — CORS-safe subtitle proxy
- `GET|POST /api/playback/history` — Resume position persistence

## Database Schema

- `streams_cache` — 24h torrent result cache
- `user_preferences` — BYOD token + quality/language prefs
- `playback_history` — Resume timestamp tracking
- `subtitle_index` — Converted VTT cache
- `source_scores` — Stream reliability analytics
- `device_capability_rules` — Client compatibility rules

## Development

```bash
npm install --legacy-peer-deps
npm run dev
```

## Deployment (Vercel)

```bash
vercel --prod
```

## Required Environment Variables

See `.env.example`
