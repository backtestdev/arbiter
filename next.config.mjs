/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.polymarket.com" },
      { protocol: "https", hostname: "**.kalshi.com" },
    ],
  },
};

export default nextConfig;
