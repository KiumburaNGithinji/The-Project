"use client";

import { useEffect, useRef, useState } from "react";

const BUCKET_SECONDS = 5;
const COMPLETE_AT = 0.9; // 90% of the lecture actually seen
const SAVE_EVERY_MS = 15_000;

type Props = {
  lessonId: string;
  youtubeId: string;
  startAt: number;
  initialPercent: number;
  initiallyComplete: boolean;
};

declare global {
  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();

  return new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.getElementById("yt-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
}

export default function LessonPlayer({
  lessonId,
  youtubeId,
  startAt,
  initialPercent,
  initiallyComplete,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  // Which 5s slices of the video this student has actually watched. Using
  // coverage rather than elapsed time means scrubbing to the end proves nothing.
  const bucketsRef = useRef<Set<number>>(new Set());
  const durationRef = useRef(0);
  const dirtyRef = useRef(false);

  const [percent, setPercent] = useState(initialPercent);
  const [complete, setComplete] = useState(initiallyComplete);

  useEffect(() => {
    // Seed coverage so a returning student's bar doesn't reset to zero.
    if (initialPercent > 0) {
      const seed = Math.floor((initialPercent / 100) * (startAt / BUCKET_SECONDS));
      for (let i = 0; i < seed; i++) bucketsRef.current.add(i);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    let tick: ReturnType<typeof setInterval> | undefined;
    let saver: ReturnType<typeof setInterval> | undefined;

    const save = async (final = false) => {
      if (!dirtyRef.current || !durationRef.current) return;
      dirtyRef.current = false;

      const total = Math.max(1, Math.ceil(durationRef.current / BUCKET_SECONDS));
      const pct = Math.min(100, (bucketsRef.current.size / total) * 100);
      const position = Math.floor(playerRef.current?.getCurrentTime() ?? 0);
      const done = pct >= COMPLETE_AT * 100;

      const body = JSON.stringify({
        lessonId,
        lastPositionSeconds: position,
        watchedSeconds: bucketsRef.current.size * BUCKET_SECONDS,
        percentWatched: Number(pct.toFixed(2)),
        completed: done,
      });

      if (final && navigator.sendBeacon) {
        navigator.sendBeacon("/api/progress", new Blob([body], { type: "application/json" }));
        return;
      }
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    };

    loadIframeApi().then(() => {
      if (cancelled || !hostRef.current) return;

      playerRef.current = new window.YT!.Player(hostRef.current, {
        videoId: youtubeId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          start: Math.max(0, Math.floor(startAt)),
        },
        events: {
          onReady: (e) => {
            durationRef.current = e.target.getDuration();
          },
          onStateChange: (e) => {
            if (e.data === window.YT!.PlayerState.PAUSED) void save();
            if (e.data === window.YT!.PlayerState.ENDED) void save();
          },
        },
      });

      tick = setInterval(() => {
        const p = playerRef.current;
        if (!p?.getPlayerState) return;
        if (p.getPlayerState() !== window.YT!.PlayerState.PLAYING) return;

        durationRef.current = p.getDuration() || durationRef.current;
        if (!durationRef.current) return;

        bucketsRef.current.add(Math.floor(p.getCurrentTime() / BUCKET_SECONDS));
        dirtyRef.current = true;

        const total = Math.max(1, Math.ceil(durationRef.current / BUCKET_SECONDS));
        const pct = Math.min(100, (bucketsRef.current.size / total) * 100);
        setPercent(pct);
        if (pct >= COMPLETE_AT * 100) setComplete(true);
      }, 1000);

      saver = setInterval(() => void save(), SAVE_EVERY_MS);
    });

    const onHide = () => {
      if (document.visibilityState === "hidden") void save(true);
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      cancelled = true;
      if (tick) clearInterval(tick);
      if (saver) clearInterval(saver);
      document.removeEventListener("visibilitychange", onHide);
      void save(true);
      playerRef.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, youtubeId]);

  return (
    <div>
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
        <div ref={hostRef} className="h-full w-full" />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>
        <span className="w-28 shrink-0 text-right font-mono text-xs text-muted">
          {complete ? "complete" : `${Math.floor(percent)}% watched`}
        </span>
      </div>
    </div>
  );
}
