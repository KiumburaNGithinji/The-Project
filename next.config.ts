import type { NextConfig } from "next";

/** Supabase storage host, derived from the project URL. */
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Lecture thumbnails come straight from YouTube. These URLs resolve for
      // unlisted videos too, so no upload step is needed.
      { protocol: "https", hostname: "i.ytimg.com" },
      // Discord avatars, captured into profiles.avatar_url on first sign-in.
      { protocol: "https", hostname: "cdn.discordapp.com" },
      // Custom thumbnails the mentor uploads.
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost }]
        : []),
    ],
  },
};

export default nextConfig;
