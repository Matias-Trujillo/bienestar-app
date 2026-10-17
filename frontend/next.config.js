/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: "http://backend:8000/api/v1/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
