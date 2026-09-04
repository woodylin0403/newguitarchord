import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this folder. Without this, Next.js walks up and
  // finds a stray package-lock.json in the Windows home directory and warns
  // about an ambiguous root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
