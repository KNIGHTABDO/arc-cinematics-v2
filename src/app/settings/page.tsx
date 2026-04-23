"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase, supabase } from "@/components/supabase-provider";
import { Navbar } from "@/components/layout/Navbar";
import { Save, Key, Globe, Palette, Monitor } from "lucide-react";

export default function SettingsPage() {
  const { user, loading } = useSupabase();
  const router = useRouter();
  const [rdKey, setRdKey] = useState("");
  const [quality, setQuality] = useState("2160p");
  const [language, setLanguage] = useState("ar");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_preferences").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setRdKey(data.real_debrid_api_key || "");
        setQuality(data.preferred_quality || "2160p");
        setLanguage(data.preferred_language || "ar");
      }
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("user_preferences").upsert({
      user_id: user.id,
      real_debrid_api_key: rdKey,
      preferred_quality: quality,
      preferred_language: language,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) setMessage("Error: " + error.message);
    else setMessage("Settings saved successfully.");
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-black text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="mx-auto max-w-xl px-6 pt-24 pb-12">
        <h1 className="mb-8 text-2xl font-bold">Settings</h1>

        {/* BYOD */}
        <div className="mb-6 space-y-4 rounded-xl bg-zinc-900/80 p-6 ring-1 ring-white/5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/40">
            <Key size={16} /> Bring Your Own Debrid
          </div>
          <p className="text-xs text-white/50">
            Your personal Real-Debrid token from{" "}
            <a href="https://real-debrid.com/apitoken" target="_blank" rel="noreferrer" className="text-amber-400 underline">real-debrid.com/apitoken</a>
          </p>
          <input
            type="password"
            value={rdKey}
            onChange={(e) => setRdKey(e.target.value)}
            placeholder="RD API Token"
            className="w-full rounded-lg bg-black/50 px-3 py-2.5 text-sm outline-none ring-1 ring-white/10 transition focus:ring-amber-500"
          />
        </div>

        {/* Preferences */}
        <div className="mb-6 space-y-4 rounded-xl bg-zinc-900/80 p-6 ring-1 ring-white/5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/40">
            <Monitor size={16} /> Playback
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-white/50">Preferred Quality</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full rounded-lg bg-black/50 px-3 py-2.5 text-sm outline-none ring-1 ring-white/10"
            >
              <option value="2160p">4K Ultra HD (2160p)</option>
              <option value="1080p">Full HD (1080p)</option>
              <option value="720p">HD (720p)</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-white/50">Subtitle Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-lg bg-black/50 px-3 py-2.5 text-sm outline-none ring-1 ring-white/10"
            >
              <option value="ar">Arabic</option>
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50"
        >
          <Save size={16} /> {saving ? "Saving..." : "Save Settings"}
        </button>

        {message && (
          <p className={`mt-4 text-center text-xs ${message.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
