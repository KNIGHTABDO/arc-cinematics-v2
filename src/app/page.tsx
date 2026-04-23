"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/supabase-provider";

export default function Home() {
  const { user, loading } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) router.push("/profiles");
    else router.push("/login");
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-transparent border-t-amber-500" />
    </div>
  );
}
