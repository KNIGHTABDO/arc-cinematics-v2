"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSupabase } from "@/components/supabase-provider";
import { useEffect, useState } from "react";
import { Search, Settings, LogOut, User, Home, Film, Tv, Baby } from "lucide-react";

export function Navbar() {
  const { user, signOut, activeProfile } = useSupabase();
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

  if (pathname?.startsWith("/play/")) return null;

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-black/90 backdrop-blur-md" : "bg-transparent"}`}>
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 md:px-6 py-3">
        <div className="flex items-center gap-4 md:gap-6">
          <Link href="/browse" className="text-lg font-bold tracking-tight shrink-0">
            <span className="text-amber-500">ARC</span> Cinematics
          </Link>
          <div className="hidden items-center gap-4 text-sm text-white/70 md:flex">
            <Link href="/browse" className="hover:text-white transition flex items-center gap-1"><Home size={14} /> Home</Link>
            <Link href="/browse?type=movies" className="hover:text-white transition flex items-center gap-1"><Film size={14} /> Movies</Link>
            <Link href="/browse?type=tv" className="hover:text-white transition flex items-center gap-1"><Tv size={14} /> TV Shows</Link>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles..."
                className="w-40 md:w-48 rounded bg-white/10 px-3 py-1 text-sm text-white outline-none ring-1 ring-white/20 focus:ring-amber-500"
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
          <Link href="/settings" className="rounded p-2 text-white/70 hover:bg-white/10 hover:text-white hidden sm:block">
            <Settings size={18} />
          </Link>
          {/* Active Profile Badge */}
          {activeProfile && (
            <Link
              href="/profiles"
              className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/70 ring-1 ring-white/10 hover:bg-white/10 hover:text-white transition"
              title="Switch profile"
            >
              {activeProfile.is_kids ? <Baby size={12} className="text-green-400" /> : <User size={12} />}
              <span className="max-w-[80px] truncate">{activeProfile.name}</span>
            </Link>
          )}
          {user ? (
            <button onClick={signOut} className="rounded p-2 text-white/70 hover:bg-white/10 hover:text-red-400">
              <LogOut size={18} />
            </button>
          ) : (
            <Link href="/login" className="rounded bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
