import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["dns2", "net", "dns"],
};

export default nextConfig;
