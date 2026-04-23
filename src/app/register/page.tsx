"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/supabase-provider";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Create default profile immediately if user is signed in
    if (data.user) {
      await supabase.from("profiles").insert({
        user_id: data.user.id,
        name: "Default",
        is_kids: false,
      }).select().single();
    }
    router.push("/login?registered=1");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm rounded-xl bg-zinc-900 p-8">
        <h1 className="mb-6 text-center text-xl font-bold">Create Account</h1>
        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded bg-black/50 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-amber-500"
            required
          />
          <input
            type="password"
            placeholder="Password (min 6)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded bg-black/50 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-amber-500"
            required
            minLength={6}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-amber-500 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        <p className="mt-4 text-center text-xs text-white/50">
          Already have an account?{" "}
          <Link href="/login" className="text-amber-400 underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
