-- Migration: Profile-scoped watch history, lists, and millisecond precision
-- Date: 2026-04-24

-- 1. Add pin_hash to profiles (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- 2. Profile-scoped watch history (REPLACES playback_history)
-- Drop old playback_history or keep it for migration; we'll create a new table.
CREATE TABLE IF NOT EXISTS profile_watch_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    tmdb_id VARCHAR(50) NOT NULL,
    media_type VARCHAR(10) NOT NULL, -- 'movie' or 'tv'
    season_number INT,
    episode_number INT,
    position_ms BIGINT DEFAULT 0 NOT NULL, -- millisecond precision
    duration_ms BIGINT DEFAULT 0 NOT NULL,
    completed BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, tmdb_id, season_number, episode_number)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_pwh_profile ON profile_watch_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_pwh_user ON profile_watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_pwh_updated ON profile_watch_history(updated_at DESC);

-- 3. Profile lists (e.g. "My List", "Watch Later")
CREATE TABLE IF NOT EXISTS profile_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL DEFAULT 'My List',
    is_default BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, name)
);

CREATE INDEX IF NOT EXISTS idx_profile_lists_profile ON profile_lists(profile_id);

-- 4. List items
CREATE TABLE IF NOT EXISTS profile_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID REFERENCES profile_lists(id) ON DELETE CASCADE NOT NULL,
    tmdb_id VARCHAR(50) NOT NULL,
    media_type VARCHAR(10) NOT NULL, -- 'movie' or 'tv'
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(list_id, tmdb_id, media_type)
);

CREATE INDEX IF NOT EXISTS idx_list_items_list ON profile_list_items(list_id);

-- 5. Row Level Security
ALTER TABLE profile_watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_list_items ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see/modify their own profile data
CREATE POLICY "Users can view own watch history" ON profile_watch_history
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own watch history" ON profile_watch_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own watch history" ON profile_watch_history
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own watch history" ON profile_watch_history
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own lists" ON profile_lists
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lists" ON profile_lists
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lists" ON profile_lists
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lists" ON profile_lists
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own list items" ON profile_list_items
    FOR SELECT USING (
        list_id IN (SELECT id FROM profile_lists WHERE user_id = auth.uid())
    );
CREATE POLICY "Users can insert own list items" ON profile_list_items
    FOR INSERT WITH CHECK (
        list_id IN (SELECT id FROM profile_lists WHERE user_id = auth.uid())
    );
CREATE POLICY "Users can delete own list items" ON profile_list_items
    FOR DELETE USING (
        list_id IN (SELECT id FROM profile_lists WHERE user_id = auth.uid())
    );

-- 6. Function to auto-create default "My List" for new profiles
CREATE OR REPLACE FUNCTION create_default_profile_list()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profile_lists (profile_id, user_id, name, is_default)
    VALUES (NEW.id, NEW.user_id, 'My List', TRUE)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_create_default_list ON profiles;
CREATE TRIGGER trg_create_default_list
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_profile_list();

-- 7. Backfill default lists for existing profiles that don't have one
INSERT INTO profile_lists (profile_id, user_id, name, is_default)
SELECT p.id, p.user_id, 'My List', TRUE
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM profile_lists pl WHERE pl.profile_id = p.id AND pl.is_default = TRUE
)
ON CONFLICT DO NOTHING;
