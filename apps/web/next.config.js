/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/ui', '@repo/database', '@repo/shared'],
  images: {
    domains: ['graph.facebook.com', 'scontent.xx.fbcdn.net'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;