"use client";

import { useEffect, useState } from "react";
import Mark from "@/components/Mark";

/**
 * Shown once per document load, not per navigation. This lives in the root
 * layout, and a layout does not remount when the router moves between pages —
 * so a reload or a cold arrival gets the animation and clicking around the
 * site does not.
 *
 * It renders on the server too, so it is painted with the first byte rather
 * than appearing a moment later. The fade-out belongs to CSS; this component
 * only takes the finished node out of the tree.
 */
export default function Splash() {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGone(true), 1400);
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;

  return (
    <div
      aria-hidden="true"
      className="splash pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background"
    >
      <Mark className="splash-mark h-16 w-16" animate />
      <p className="splash-word text-lg font-semibold tracking-tight text-foreground">
        The Project
      </p>
    </div>
  );
}
