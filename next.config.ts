import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    workerThreads: false,
    cpus: 1
  },
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'coinairank.com',
          },
        ],
        destination: 'https://aicoinsignals.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.coinairank.com',
          },
        ],
        destination: 'https://aicoinsignals.com/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
