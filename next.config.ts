import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables `use cache` + cacheLife (used by app/api/transcript/route.ts).
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
