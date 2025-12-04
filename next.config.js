/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Only set if explicitly provided, otherwise let rewrites handle it
    ...(process.env.NEXT_PUBLIC_API_URL && {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    }),
  },
  async rewrites() {
    // Use rewrites in development when API_URL is not explicitly set
    // In production, NEXT_PUBLIC_API_URL should be set
    const isDev = process.env.NODE_ENV !== 'production';
    const hasApiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (isDev && !hasApiUrl) {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:7000/api/:path*',
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;

