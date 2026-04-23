
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: user_preferences (BYOD Architecture)
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    real_debrid_api_key TEXT,
    preferred_quality VARCHAR(10) DEFAULT '2160p',
    preferred_language VARCHAR(5) DEFAULT 'ar',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: streams_cache (Prevents re-scraping Torrents)
CREATE TABLE IF NOT EXISTS streams_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tmdb_id VARCHAR(50) NOT NULL,
    media_type VARCHAR(10) NOT NULL,
    season_number INT,
    episode_number INT,
    raw_results JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
    UNIQUE (tmdb_id, media_type, season_number, episode_number)
);

-- Table: source_scores
CREATE TABLE IF NOT EXISTS source_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    info_hash VARCHAR(64) NOT NULL,
    success_count INT DEFAULT 0,
    fail_count INT DEFAULT 0,
    last_tested TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: playback_history (Resume functionality)
CREATE TABLE IF NOT EXISTS playback_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    tmdb_id VARCHAR(50) NOT NULL,
    media_type VARCHAR(10) NOT NULL,
    season_number INT,
    episode_number INT,
    timestamp_seconds INT DEFAULT 0,
    duration_seconds INT DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tmdb_id, season_number, episode_number)
);

-- Table: subtitle_index
CREATE TABLE IF NOT EXISTS subtitle_index (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tmdb_id VARCHAR(50) NOT NULL,
    language_code VARCHAR(10) NOT NULL,
    vtt_payload TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tmdb_id, language_code)
);

-- Table: device_capability_rules
CREATE TABLE IF NOT EXISTS device_capability_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_agent_regex TEXT NOT NULL,
    max_resolution_supported VARCHAR(10) DEFAULT '2160p',
    supported_codecs TEXT[] DEFAULT ARRAY['h264', 'h265'],
    blocked_containers TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_streams_cache_lookup ON streams_cache(tmdb_id, media_type, season_number, episode_number);
CREATE INDEX IF NOT EXISTS idx_playback_history_user ON playback_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subtitle_lookup ON subtitle_index(tmdb_id, language_code);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    is_kids BOOLEAN DEFAULT FALSE NOT NULL,
    ui_language TEXT DEFAULT 'en' NOT NULL,
    tmdb_language TEXT DEFAULT 'en-US' NOT NULL,
    subtitle_language TEXT DEFAULT 'ar' NOT NULL,
    video_quality TEXT DEFAULT '1080p' NOT NULL,
    theme_accent TEXT DEFAULT 'oklch(0.76 0.15 305)' NOT NULL,
    real_debrid_api_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profiles" ON profiles;
CREATE POLICY "Users can view own profiles" ON profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profiles" ON profiles;
CREATE POLICY "Users can insert own profiles" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profiles" ON profiles;
CREATE POLICY "Users can update own profiles" ON profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own profiles" ON profiles;
CREATE POLICY "Users can delete own profiles" ON profiles FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
