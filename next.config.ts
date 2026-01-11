import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname, // Explicitly set the workspace root to silence lockfile warnings
  },
};

export default nextConfig;
