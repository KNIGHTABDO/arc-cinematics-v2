"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase, supabase } from "@/components/supabase-provider";
import { Plus, Trash2, Baby } from "lucide-react";

interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  is_kids: boolean;
  user_id: string;
}

function avatarGradient(name: string) {
  const colors = [
    "linear-gradient(135deg, #f59e0b, #ef4444)",
    "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    "linear-gradient(135deg, #10b981, #06b6d4)",
    "linear-gradient(135deg, #ec4899, #f43f5e)",
    "linear-gradient(135deg, #6366f1, #a855f7)",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function ProfilesPage() {
  const { user, loading } = useSupabase();
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [isKids, setIsKids] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).then(({ data }) => {
      if (data) setProfiles(data as Profile[]);
    });
  }, [user]);

  const selectProfile = (profile: Profile) => {
    localStorage.setItem("arc_active_profile", profile.id);
    localStorage.setItem("arc_profile_name", profile.name);
    localStorage.setItem("arc_profile_kids", String(profile.is_kids));
    router.push("/browse");
  };

  const addProfile = async () => {
    if (!user || !newName.trim()) return;
    const { data, error } = await supabase.from("profiles").insert({
      user_id: user.id,
      name: newName.trim(),
      is_kids: isKids,
    }).select().single();
    if (!error && data) {
      setProfiles((prev) => [...prev, data as Profile]);
      setShowAdd(false);
      setNewName("");
      setIsKids(false);
    }
  };

  const deleteProfile = async (id: string) => {
    if (!confirm("Delete this profile?")) return;
    await supabase.from("profiles").delete().eq("id", id);
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-black text-white">Loading...</div>;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-white">
      <h1 className="mb-10 text-[clamp(32px,5vw,56px)] font-extrabold tracking-tight">Who's watching?</h1>

      <div className="flex flex-wrap items-start justify-center gap-6 md:gap-10">
        {profiles.map((p) => (
          <div key={p.id} className="group relative flex flex-col items-center gap-3">
            <button
              onClick={() => selectProfile(p)}
              className="relative h-24 w-24 overflow-hidden rounded-full transition duration-300 hover:scale-105 md:h-32 md:w-32"
              style={{ background: p.avatar_url ? "none" : avatarGradient(p.name) }}
            >
              {p.avatar_url ? (
                <img src={p.avatar_url} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold">
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              {p.is_kids && (
                <div className="absolute bottom-0 right-0 rounded-full bg-green-500 p-1">
                  <Baby size={12} className="text-white" />
                </div>
              )}
            </button>
            <span className="text-sm text-white/70">{p.name}</span>
            <button
              onClick={() => deleteProfile(p.id)}
              className="absolute -right-2 -top-2 rounded-full bg-red-500/80 p-1 opacity-0 transition group-hover:opacity-100"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}

        {/* Add Profile */}
        <div className="flex flex-col items-center gap-3">
          {showAdd ? (
            <div className="rounded-xl bg-zinc-900 p-4">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Profile name"
                className="mb-2 w-full rounded bg-black/50 px-3 py-2 text-sm outline-none ring-1 ring-white/10"
                onKeyDown={(e) => e.key === "Enter" && addProfile()}
              />
              <label className="mb-3 flex items-center gap-2 text-xs text-white/60">
                <input type="checkbox" checked={isKids} onChange={(e) => setIsKids(e.target.checked)} />
                Kids profile
              </label>
              <div className="flex gap-2">
                <button onClick={addProfile} className="rounded bg-amber-500 px-3 py-1 text-xs font-medium text-black">Add</button>
                <button onClick={() => setShowAdd(false)} className="rounded bg-white/10 px-3 py-1 text-xs">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-white/20 transition hover:border-white/40 hover:bg-white/5 md:h-32 md:w-32"
            >
              <Plus size={32} className="text-white/30" />
            </button>
          )}
          <span className="text-sm text-white/50">Add Profile</span>
        </div>
      </div>
    </div>
  );
}
