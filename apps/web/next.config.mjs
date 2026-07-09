import path from "node:path";
import { fileURLToPath } from "node:url";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  output: "standalone",
  outputFileTracingRoot: path.join(appDirectory, "../.."),
  async rewrites() {
    const gateway = process.env.PUBLIC_WS_GATEWAY_URL ?? process.env.PUBLIC_API_GATEWAY_URL ?? "http://localhost:4000";
    return [
      {
        source: "/socket.io/:path*",
        destination: `${gateway}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
