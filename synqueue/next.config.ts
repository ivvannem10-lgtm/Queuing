import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Custom server handles Socket.IO; suppress the default server warning
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  webpack: (config) => {
    // Required for socket.io-client to work in Next.js
    config.externals = [...(config.externals || []), { bufferutil: 'bufferutil', 'utf-8-validate': 'utf-8-validate' }]
    return config
  },
}

export default nextConfig
