import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Transpile the shared workspace package (TypeScript source)
  transpilePackages: ['@dropzone/shared', '@dropzone/crypto'],
  // Set the workspace root to silence multi-lockfile warning
  turbopack: {
    root: path.join(__dirname, '../..'),
  },
};

export default nextConfig;
