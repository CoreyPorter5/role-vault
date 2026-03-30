import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image-service-cdn.seek.com.au",
        port: "",
        pathname: "/**"
      }
    ]
  },

};

export default nextConfig;
