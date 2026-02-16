/** @type {import('next').NextConfig} */
import withPWAInit from "next-pwa";

const isProd =
  process.env.NODE_ENV === "production" &&
  process.env.VERCEL_ENV === "production";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: !isProd,
});
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
}

export default withPWA(nextConfig)