import type { NextConfig } from "next";

// Optional: when set (at build time), the site forwards /api/* and /uploads/* to this backend itself, so the
// browser only ever talks to ONE origin. That keeps the httpOnly refresh-token cookie first-party — with the
// frontend and backend on different free hosts (e.g. Netlify + Render) it would otherwise be a cross-site cookie
// that browsers increasingly block. Used together with NEXT_PUBLIC_API_URL="" (see docs/deploy-free.md).
// Leave unset for local dev and Docker, where the browser calls the backend directly.
const backendUrl = process.env.BACKEND_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // Minimal self-contained server bundle (.next/standalone) for the Docker image. Netlify builds Next.js
  // with its own adapter, which doesn't want this, so skip it there (Netlify sets NETLIFY=true during builds).
  output: process.env.NETLIFY ? undefined : "standalone",

  async rewrites() {
    if (!backendUrl) return [];
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/uploads/:path*", destination: `${backendUrl}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
