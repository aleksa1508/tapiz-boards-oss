import type { NextConfig } from "next";

// Versioning scheme: fixed major "1" + build date as DDMMYY (e.g. 1.100726).
// Computed once at build time, baked into the client bundle via `env` — not
// recomputed per-request.
const now = new Date();
const version = `1.${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getFullYear()).slice(-2)}`;

/** Baseline hardening for every response. */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // No framing of the app (clickjacking); the public read-only board stays embeddable.
      { source: "/((?!board/).*)", headers: [{ key: "X-Frame-Options", value: "DENY" }] },
    ];
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_BUILD_DATE: now.toISOString(),
  },
  /* Native/CJS paketi se ne bundluju u serverless funkciju (manji cold start) —
     Next ih učitava iz node_modules u runtime-u. */
  serverExternalPackages: ["mysql2", "bcryptjs"],
  experimental: {
    /* Client router cache: ponovne navigacije na već posećene rute su trenutne;
       mutacije i dalje osvežavaju podatke kroz revalidatePath/router.refresh(). */
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
