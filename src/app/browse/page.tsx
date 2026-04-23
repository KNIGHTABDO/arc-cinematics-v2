"use client";

import { Suspense } from "react";
import BrowseContent from "./BrowseContent";

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-transparent border-t-amber-500" />
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
}
