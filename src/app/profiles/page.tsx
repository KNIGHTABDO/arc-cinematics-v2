"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase, supabase } from "@/components/supabase-provider";
import { Plus, Trash2, Baby, Lock } from "lucide-react";

interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  is_kids: boolean;
  user_id: string;
  pin_hash?: string | null;
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
  const [pageLoading, setPageLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [isKids, setIsKids] = useState(false);
  const [pinModal, setPinModal] = useState<{ profile: Profile; pin: string; error: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    loadProfiles();
  }, [user]);

  const loadProfiles = async () => {
    if (!user) return;
    setPageLoading(true);
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id);
    let list = (data || []) as Profile[];
    
    // Auto-create default profile if none exist
    if (list.length === 0) {
      const { data: created } = await supabase.from("profiles").insert({
        user_id: user.id,
        name: "Default",
        is_kids: false,
      }).select().single();
      if (created) list = [created as Profile];
    }
    
    setProfiles(list);
    setPageLoading(false);
  };

  const selectProfile = (profile: Profile) => {
    if (profile.pin_hash) {
      setPinModal({ profile, pin: "", error: "" });
      return;
    }
    activateProfile(profile);
  };

  const activateProfile = (profile: Profile) => {
    localStorage.setItem("arc_active_profile", profile.id);
    localStorage.setItem("arc_profile_name", profile.name);
    localStorage.setItem("arc_profile_kids", String(profile.is_kids));
    window.dispatchEvent(new Event("arc-profile-change"));
    router.push("/browse");
  };

  const verifyPin = () => {
    if (!pinModal) return;
    if (pinModal.pin === pinModal.profile.pin_hash) {
      setPinModal(null);
      activateProfile(pinModal.profile);
    } else {
      setPinModal({ ...pinModal, error: "Incorrect PIN. Try again." });
    }
  };

  const addProfile = async () => {
    if (!user || !newName.trim()) return;
    const insertData: Record<string, unknown> = {
      user_id: user.id,
      name: newName.trim(),
      is_kids: isKids,
    };
    if (newPin && /^\d{4}$/.test(newPin)) {
      insertData.pin_hash = newPin; // plain 4-digit pin
    }
    const { data, error } = await supabase.from("profiles").insert(insertData).select().single();
    if (!error && data) {
      setProfiles((prev) => [...prev, data as Profile]);
      setShowAdd(false);
      setNewName("");
      setNewPin("");
      setIsKids(false);
    }
  };

  const deleteProfile = async (id: string) => {
    if (!confirm("Delete this profile?")) return;
    await supabase.from("profiles").delete().eq("id", id);
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  };

  if (loading || pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-transparent border-t-amber-500" />
      </div>
    );
  }

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
              {p.pin_hash && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <Lock size={20} className="text-white" />
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
            <div className="rounded-xl bg-zinc-900 p-4 w-64">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Profile name"
                className="mb-2 w-full rounded bg-black/50 px-3 py-2 text-sm outline-none ring-1 ring-white/10"
                onKeyDown={(e) => e.key === "Enter" && addProfile()}
              />
              <input
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="PIN (4 digits, optional)"
                type="password"
                inputMode="numeric"
                className="mb-2 w-full rounded bg-black/50 px-3 py-2 text-sm outline-none ring-1 ring-white/10"
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

      {/* PIN Modal */}
      {pinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-72 rounded-xl bg-zinc-900 p-6 text-center">
            <Lock size={32} className="mx-auto mb-3 text-amber-500" />
            <p className="mb-1 text-sm font-semibold">Enter PIN for {pinModal.profile.name}</p>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinModal.pin}
              onChange={(e) => setPinModal({ ...pinModal, pin: e.target.value.replace(/\D/g, ""), error: "" })}
              onKeyDown={(e) => e.key === "Enter" && verifyPin()}
              className="mb-3 w-full rounded bg-black/50 px-3 py-2 text-center text-lg tracking-[0.5em] outline-none ring-1 ring-white/10 focus:ring-amber-500"
              placeholder="••••"
            />
            {pinModal.error && <p className="mb-3 text-xs text-red-400">{pinModal.error}</p>}
            <div className="flex gap-2 justify-center">
              <button onClick={verifyPin} className="rounded bg-amber-500 px-4 py-1.5 text-xs font-semibold text-black">Unlock</button>
              <button onClick={() => setPinModal(null)} className="rounded bg-white/10 px-4 py-1.5 text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
