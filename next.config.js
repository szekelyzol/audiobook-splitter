/** @type {import('next').NextConfig} */

const isGhPages = Boolean(process.env.GITHUB_PAGES);
const repoName = 'audiobook-splitter';

const nextConfig = {
  reactStrictMode: true,
  // Use static export only for GitHub Pages builds
  ...(isGhPages
    ? {
        output: 'export',
        trailingSlash: true,
        images: { unoptimized: true },
        basePath: `/${repoName}`,
        assetPrefix: `/${repoName}/`,
      }
    : {}),
};

module.exports = nextConfig;
