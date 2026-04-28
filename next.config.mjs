/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  reactCompiler: true,
  experimental: {
    // Phosphor ships ~9000 icon modules; without this Next compiles
    // every one in dev mode and the dev server crawls. Tree-shakes
    // unused icons out of prod bundle as a bonus.
    optimizePackageImports: ['@phosphor-icons/react'],
  },
};

export default nextConfig;
