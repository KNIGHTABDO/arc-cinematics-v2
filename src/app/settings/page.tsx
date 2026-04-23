"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/supabase-provider";
import { Navbar } from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Save, Monitor, Globe } from "lucide-react";

export default function SettingsPage() {
  const { user, loading } = useSupabase();
  const router = useRouter();
  const [quality, setQuality] = useState("2160p");
  const [language, setLanguage] = useState("ar");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("arc-settings") : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.quality) setQuality(parsed.quality);
        if (parsed.language) setLanguage(parsed.language);
      } catch {}
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    localStorage.setItem("arc-settings", JSON.stringify({ quality, language }));
    setTimeout(() => {
      setSaving(false);
      setMessage("Settings saved successfully.");
    }, 400);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-black text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="mx-auto max-w-xl px-6 pt-24 pb-12">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-2xl font-bold"
        >
          Settings
        </motion.h1>

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
