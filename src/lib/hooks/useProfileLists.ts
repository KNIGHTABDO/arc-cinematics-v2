"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/components/supabase-provider";

export interface ProfileList {
  id: string;
  profile_id: string;
  name: string;
  is_default: boolean;
}

export interface ListItem {
  id: string;
  list_id: string;
  tmdb_id: string;
  media_type: "movie" | "tv";
  added_at: string;
}

export function useProfileLists(profileId: string | undefined) {
  const [lists, setLists] = useState<ProfileList[]>([]);
  const [items, setItems] = useState<Record<string, ListItem[]>>({});
  const [loading, setLoading] = useState(false);

  const loadLists = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    const { data } = await supabase
      .from("profile_lists")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: true });
    setLists((data || []) as ProfileList[]);
    setLoading(false);
  }, [profileId]);

  const loadItems = useCallback(async (listId: string) => {
    const { data } = await supabase
      .from("profile_list_items")
      .select("*")
      .eq("list_id", listId)
      .order("added_at", { ascending: false });
    setItems((prev) => ({ ...prev, [listId]: (data || []) as ListItem[] }));
  }, []);

  const addToList = useCallback(async (listId: string, tmdbId: string, mediaType: "movie" | "tv") => {
    await supabase.from("profile_list_items").upsert(
      { list_id: listId, tmdb_id: tmdbId, media_type: mediaType },
      { onConflict: "list_id,tmdb_id,media_type" }
    );
    await loadItems(listId);
  }, [loadItems]);

  const removeFromList = useCallback(async (listId: string, tmdbId: string, mediaType: "movie" | "tv") => {
    await supabase
      .from("profile_list_items")
      .delete()
      .eq("list_id", listId)
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType);
    await loadItems(listId);
  }, [loadItems]);

  const isInList = useCallback((listId: string, tmdbId: string, mediaType: "movie" | "tv") => {
    return (items[listId] || []).some((i) => i.tmdb_id === tmdbId && i.media_type === mediaType);
  }, [items]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    lists.forEach((l) => loadItems(l.id));
  }, [lists, loadItems]);

  return { lists, items, loading, addToList, removeFromList, isInList, reload: loadLists };
}
