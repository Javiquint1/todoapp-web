const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@shared/types', '@shared/validation', '@shared/database'],
  // Path alias configuration for monorepo
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@shared/types': path.resolve(__dirname, './packages/shared/src'),
      '@shared/validation': path.resolve(__dirname, './packages/validation/src'),
      '@shared/database': path.resolve(__dirname, './packages/database/src'),
    };
    return config;
  },
};

module.exports = nextConfig;
