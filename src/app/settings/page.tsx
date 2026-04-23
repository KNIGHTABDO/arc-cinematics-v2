"use client";

import { useEffect, useState } from "react";
import { useSupabase, supabase } from "@/components/supabase-provider";
import { useRouter } from "next/navigation";

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
    supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
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
    else setMessage("Saved successfully.");
  };

  if (loading) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="mx-auto max-w-xl p-8 text-white">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      <div className="mb-6 space-y-4 rounded-lg bg-zinc-900 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">Bring Your Own Debrid</h2>
        <p className="text-xs text-white/60">
          Enter your personal Real-Debrid API token from{" "}
          <a href="https://real-debrid.com/apitoken" target="_blank" rel="noreferrer" className="text-amber-400 underline">
            real-debrid.com/apitoken
          </a>
        </p>
        <input
          type="password"
          value={rdKey}
          onChange={(e) => setRdKey(e.target.value)}
          placeholder="RD API Token"
          className="w-full rounded bg-black/50 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-amber-500"
        />
      </div>

      <div className="mb-6 space-y-4 rounded-lg bg-zinc-900 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">Preferences</h2>
        <div>
          <label className="mb-1 block text-xs text-white/60">Preferred Quality</label>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            className="w-full rounded bg-black/50 px-3 py-2 text-sm outline-none ring-1 ring-white/10"
          >
            <option value="2160p">4K (2160p)</option>
            <option value="1080p">1080p</option>
            <option value="720p">720p</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/60">Preferred Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded bg-black/50 px-3 py-2 text-sm outline-none ring-1 ring-white/10"
          >
            <option value="ar">Arabic</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>

      {message && <p className="mt-3 text-xs text-white/70">{message}</p>}
    </div>
  );
}
