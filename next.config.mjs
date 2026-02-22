import withPWA from "next-pwa";

const nextConfig = {
  reactStrictMode: true,
};
const isDev = process.env.NODE_ENV === "development";

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  dynamicStartUrl: false,
  cacheStartUrl: true,
  fallbacks: {
    document: "/offline.html",
  },
  runtimeCaching: [
    {
      urlPattern: /^https?.*\.(?:js|css|woff2?|ttf|eot|png|jpg|jpeg|gif|svg|webp|ico)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    {
      urlPattern: /^https?:\/\/.*$/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "http-pages",
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 7,
        },
      },
    },
  ],
  disable: isDev,
})(nextConfig);
