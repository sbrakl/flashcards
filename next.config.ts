import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.164", "192.168.0.164:3000", "192.168.0.164:3001"],

  // Reduce memory pressure in dev server — dispose inactive pages faster
  onDemandEntries: {
    maxInactiveAge: 15 * 1000,   // 15s instead of default 60s
    pagesBufferLength: 5,         // Keep fewer pages in memory
  },

  experimental: {
    webpackMemoryOptimizations: true,
    webpackBuildWorker: true,
  },
};

export default nextConfig;


