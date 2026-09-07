import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Lecture thumbnails come straight from YouTube. These URLs resolve for
    // unlisted videos too, so no upload step is needed.
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com" }],
  },
};

export default nextConfig;
