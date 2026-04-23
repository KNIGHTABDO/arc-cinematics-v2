"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSupabase } from "@/components/supabase-provider";
import { useEffect, useState } from "react";
import { Search, Settings, LogOut, User } from "lucide-react";

export function Navbar() {
  const { user, signOut } = useSupabase();
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  if (pathname?.startsWith("/stream/")) return null; // Hide on player

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-black/90 backdrop-blur-md" : "bg-transparent"}`}>
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/browse" className="text-lg font-bold tracking-tight">
            <span className="text-amber-500">ARC</span> Cinematics
          </Link>
          <div className="hidden items-center gap-4 text-sm text-white/70 md:flex">
            <Link href="/browse" className="hover:text-white transition">Home</Link>
            <Link href="/browse?type=movies" className="hover:text-white transition">Movies</Link>
            <Link href="/browse?type=tv" className="hover:text-white transition">TV Shows</Link>
            <Link href="/profiles" className="hover:text-white transition">Profiles</Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles..."
                className="w-48 rounded bg-white/10 px-3 py-1 text-sm text-white outline-none ring-1 ring-white/20 focus:ring-amber-500"
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="ml-2 text-white/50 hover:text-white">
                ✕
              </button>
            </form>
          ) : (
            <button onClick={() => setSearchOpen(true)} className="rounded p-2 text-white/70 hover:bg-white/10 hover:text-white">
              <Search size={18} />
            </button>
          )}
          <Link href="/settings" className="rounded p-2 text-white/70 hover:bg-white/10 hover:text-white">
            <Settings size={18} />
          </Link>
          {user ? (
            <button onClick={signOut} className="rounded p-2 text-white/70 hover:bg-white/10 hover:text-red-400">
              <LogOut size={18} />
            </button>
          ) : (
            <Link href="/login" className="rounded p-2 text-white/70 hover:bg-white/10 hover:text-white">
              <User size={18} />
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
