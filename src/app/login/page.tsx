"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/supabase-provider";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else router.push("/profiles");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm rounded-xl bg-zinc-900 p-8">
        <h1 className="mb-6 text-center text-xl font-bold">ARC Cinematics</h1>
        <form onSubmit={handleLogin} className="space-y-4">
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
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded bg-black/50 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-amber-500"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-amber-500 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        <p className="mt-4 text-center text-xs text-white/50">
          No account?{" "}
          <Link href="/register" className="text-amber-400 underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
