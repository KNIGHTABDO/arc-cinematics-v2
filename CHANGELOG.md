## [Unreleased]

### Fixed
- Route name collision — renamed stream route to `watch` to prevent Next.js 500 errors on `/stream/[id]`

### Changed
- Stream pages now live at `/watch/:id` instead of `/stream/:id`
- Navigation updated across app (tv, title, browse, continue-watching, navbar)

# Changelog

## 2026-04-23 — SCORCHED EARTH v2.0

- **MIGRATED** from TanStack Start to Next.js 15 App Router.
- **IMPLEMENTED** full serverless Edge architecture:
  - `/api/stream/resolve` — Edge runtime, Supabase cache, Torrentio scraping, scoring engine
  - `/api/stream/unrestrict` — BYOD token decryption, Real-Debrid magnet resolution
  - `/api/subtitles/proxy` — CORS-safe SRT→VTT conversion
  - `/api/playback/history` — Resume position save/load
- **REBUILT** player with Vidstack:
  - Resume from saved timestamp
  - Next-episode countdown at 95% progress
  - Quality stream picker (remounts different RD files)
  - Subtitle toggle (Arabic/English)
  - Error recovery with fallback ladder
- **CREATED** full Supabase schema:
  - `streams_cache`, `user_preferences`, `playback_history`
  - `subtitle_index`, `source_scores`, `device_capability_rules`
- **ADDED** Settings page with BYOD token input.
- **ADDED** Auth flow (login/register) via Supabase Auth.
- **ADDED** Browse page with TMDB trending movies/TV.
- **ADDED** TV detail page with season/episode grid.
