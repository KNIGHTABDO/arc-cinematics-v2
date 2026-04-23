import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export type Database = {
  public: {
    Tables: {
      streams_cache: {
        Row: {
          id: string;
          tmdb_id: string;
          media_type: string;
          season_number: number | null;
          episode_number: number | null;
          raw_results: any;
          created_at: string;
          expires_at: string;
        };
      };
      user_preferences: {
        Row: {
          user_id: string;
          real_debrid_api_key: string;
          preferred_quality: string;
          preferred_language: string;
          updated_at: string;
        };
      };
      playback_history: {
        Row: {
          id: string;
          user_id: string;
          tmdb_id: string;
          media_type: string;
          season_number: number | null;
          episode_number: number | null;
          timestamp_seconds: number;
          duration_seconds: number;
          completed: boolean;
          updated_at: string;
        };
      };
      subtitle_index: {
        Row: {
          id: string;
          tmdb_id: string;
          language_code: string;
          vtt_payload: string;
          created_at: string;
        };
      };
      source_scores: {
        Row: {
          id: string;
          info_hash: string;
          success_count: number;
          fail_count: number;
          last_tested: string;
        };
      };
      device_capability_rules: {
        Row: {
          id: string;
          user_agent_regex: string;
          max_resolution_supported: string;
          supported_codecs: string[];
          blocked_containers: string[];
          is_active: boolean;
        };
      };
    };
  };
};
