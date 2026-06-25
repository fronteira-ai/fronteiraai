import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage — imagens de produto e loja
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // CDNs genéricos e imagens de demonstração
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
