import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Provide fallback env vars for build time (when Supabase isn't configured yet)
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-key",
  },
};

export default nextConfig;
