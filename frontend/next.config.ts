import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  /* config options here */
  experimental: {
    agentFeedback: true,
    externalDir: true,
    optimizePackageImports: ["lucide-react"],
  },
  turbopack: {
    // Agent Center consumes the single catalog owned by the backend module.
    root: path.resolve(__dirname, ".."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
