"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/components/supabase-provider";

export interface WatchHistoryItem {
  id: string;
  tmdb_id: string;
  media_type: "movie" | "tv";
  season_number?: number;
  episode_number?: number;
  position_ms: number;
  duration_ms: number;
  completed: boolean;
  updated_at: string;
}

export function useProfileHistory(profileId: string | undefined) {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    const { data } = await supabase
      .from("profile_watch_history")
      .select("*")
      .eq("profile_id", profileId)
      .eq("completed", false)
      .order("updated_at", { ascending: false })
      .limit(20);
    setHistory((data || []) as WatchHistoryItem[]);
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    load();
  }, [load]);

  return { history, loading, reload: load };
}
