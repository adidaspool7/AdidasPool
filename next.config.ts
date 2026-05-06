import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow next/image to load avatars + uploaded files served from the
    // Supabase Storage CDN. Update if a new bucket host is added.
    remotePatterns: [
      // Supabase Storage object endpoint (public bucket: talent-pool)
      // Pattern: https://<project-ref>.supabase.co/storage/v1/object/public/...
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/**" },
      // Google account avatars (used by Supabase Auth Google OAuth)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // GitHub avatars (in case OAuth provider list expands)
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
