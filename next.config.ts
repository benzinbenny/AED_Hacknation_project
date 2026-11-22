import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.AED_NEXT_DIST_DIR ?? ".next",
  devIndicators: false,
};

export default nextConfig;
