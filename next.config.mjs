import withPWAInit from "next-pwa";

const isDev = process.env.NODE_ENV === "development";
console.log("NODE_ENV =", process.env.NODE_ENV);

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: isDev,
});

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default withPWA(nextConfig);
