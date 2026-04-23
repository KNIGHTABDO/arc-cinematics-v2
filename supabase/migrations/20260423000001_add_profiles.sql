-- Profiles table (ported from old arc-streams)
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profiles" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profiles" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profiles" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profiles" ON profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Also add real_debrid_api_key to profiles (for BYOD per-profile)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS real_debrid_api_key TEXT;
