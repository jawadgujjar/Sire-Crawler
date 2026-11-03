import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the root to this project so the stray lockfile in ~/Downloads isn't picked up
    root: path.join(__dirname),
  },
};

export default nextConfig;
