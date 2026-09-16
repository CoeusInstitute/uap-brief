import type { NextConfig } from "next";

const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  agentRules: false,
  transpilePackages: ["react-force-graph-2d", "force-graph"],
  images: {
    // Story images are copied into the public `story-images` bucket by score-stories.
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/story-images/**" }]
      : [],
  },
};

export default nextConfig;
