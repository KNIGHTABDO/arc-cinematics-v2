"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient, User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let _client: ReturnType<typeof createClient> | null = null;
function getClient() {
  if (!_client && supabaseUrl && supabaseAnonKey) {
    _client = createClient(supabaseUrl, supabaseAnonKey);
  }
  if (!_client) {
    return createClient("http://localhost", "anon");
  }
  return _client;
}

const supabase = getClient();

export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  is_kids: boolean;
  user_id: string;
  pin_hash?: string | null;
}

const SupabaseContext = createContext<{
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  activeProfile: Profile | null;
  setActiveProfile: (p: Profile | null) => void;
}>({ user: null, loading: true, signOut: async () => {}, activeProfile: null, setActiveProfile: () => {} });

export const useSupabase = () => useContext(SupabaseContext);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeProfile, setActiveProfileState] = useState<Profile | null>(null);

  // Load user + active profile on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUser(u);
      if (u) {
        loadActiveProfile(u.id);
      }
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) {
        loadActiveProfile(u.id);
      } else {
        setActiveProfileState(null);
        localStorage.removeItem("arc_active_profile");
        localStorage.removeItem("arc_profile_name");
        localStorage.removeItem("arc_profile_kids");
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const loadActiveProfile = async (userId: string) => {
    const savedId = localStorage.getItem("arc_active_profile");
    if (savedId) {
      const { data } = await supabase.from("profiles").select("*").eq("id", savedId).eq("user_id", userId).single();
      if (data) {
        setActiveProfileState(data as Profile);
        localStorage.setItem("arc_profile_name", data.name);
        localStorage.setItem("arc_profile_kids", String(data.is_kids));
        return;
      }
    }
    // If no saved profile, try to find any profile and auto-select
    const { data: anyProfile } = await supabase.from("profiles").select("*").eq("user_id", userId).limit(1).maybeSingle();
    if (anyProfile) {
      const p = anyProfile as Profile;
      setActiveProfileState(p);
      localStorage.setItem("arc_active_profile", p.id);
      localStorage.setItem("arc_profile_name", p.name);
      localStorage.setItem("arc_profile_kids", String(p.is_kids));
      return;
    }
    setActiveProfileState(null);
  };

  const setActiveProfile = (p: Profile | null) => {
    setActiveProfileState(p);
    if (p) {
      localStorage.setItem("arc_active_profile", p.id);
      localStorage.setItem("arc_profile_name", p.name);
      localStorage.setItem("arc_profile_kids", String(p.is_kids));
    } else {
      localStorage.removeItem("arc_active_profile");
      localStorage.removeItem("arc_profile_name");
      localStorage.removeItem("arc_profile_kids");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveProfileState(null);
    localStorage.removeItem("arc_active_profile");
    localStorage.removeItem("arc_profile_name");
    localStorage.removeItem("arc_profile_kids");
  };

  return (
    <SupabaseContext.Provider value={{ user, loading, signOut, activeProfile, setActiveProfile }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export { supabase };
