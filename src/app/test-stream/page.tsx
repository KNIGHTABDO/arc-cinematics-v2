"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSupabase } from "@/components/supabase-provider";
import { usePlaybackOrchestrator } from "@/lib/playback/orchestrator";
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, RefreshCw, ArrowRight, Globe, Crown } from "lucide-react";
import { buildFreeEmbedUrls } from "@/lib/streaming/free-sources";
import { isIOS, buildInfuseUrl, buildVLCUrl, getPlayerOptions } from "@/lib/streaming/ios-players";
import { getRemuxUrl, isRemuxNeeded, isSafariiOS } from "@/lib/streaming/remux-proxy";

export default function TestStreamPage() {
  const { user, loading, activeProfile } = useSupabase();
  
  // Try to use the orchestrator hook
  const orchestrator = usePlaybackOrchestrator({
    tmdbId: "687163",
    mediaType: "movie",
    profileId: activeProfile?.id,
    userId: user?.id,
  });
  
  // Try to call isSafariiOS during render (this is what the stream page does in useMemo)
  const isSafari = isSafariiOS();
  const needsRemux = isRemuxNeeded("test.mkv");
  const remuxUrl = getRemuxUrl("https://example.com/video.mkv");

  return (
    <div>
      <h1>Test Stream Page</h1>
      <p>isSafari: {isSafari ? "yes" : "no"}</p>
      <p>needsRemux: {needsRemux ? "yes" : "no"}</p>
      <p>remuxUrl: {remuxUrl}</p>
      <p>loading: {loading ? "yes" : "no"}</p>
      <p>user: {user ? "logged in" : "not logged in"}</p>
      <p>activeProfile: {activeProfile ? activeProfile.name : "none"}</p>
      <p>streams: {orchestrator.scoredStreams.length}</p>
    </div>
  );
}
