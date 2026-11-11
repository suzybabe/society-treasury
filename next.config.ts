import type { NextConfig } from "next";

/**
 * Teammates can run the app without a .env.local: under `next dev` with no
 * DATABASE_URL, every /api call goes to the deployed backend on Railway
 * (override it with REMOTE_API_URL). Production builds never use this.
 */
const REMOTE_API = process.env.REMOTE_API_URL || "https://web-production-b3f76b45.up.railway.app";
const useRemoteApi = process.env.NODE_ENV === "development" && !process.env.DATABASE_URL;

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    if (!useRemoteApi) return [];
    return { beforeFiles: [{ source: "/api/:path*", destination: `${REMOTE_API}/api/:path*` }], afterFiles: [], fallback: [] };
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
