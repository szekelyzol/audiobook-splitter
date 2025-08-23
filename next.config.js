const onVercel = !!process.env.VERCEL;                // set by Vercel automatically
const isStatic = process.env.NEXT_EXPORT === 'true' && !onVercel;

// Only set basePath/assetPrefix for static (GitHub Pages-style) builds
const basePath = isStatic ? (process.env.NEXT_PUBLIC_BASE_PATH || '') : '';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  output: isStatic ? 'export' : undefined,
  trailingSlash: isStatic ? true : undefined,
  images: { unoptimized: isStatic },
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  // (optional) keep eslint dirs tidy
  eslint: { dirs: ['pages', 'components', 'lib', 'utils'] },
};

module.exports = config;