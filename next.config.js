/** @type {import('next').NextConfig} */

const isGhPages = Boolean(process.env.GITHUB_PAGES);
const repoName = 'audiobook-splitter'; // <-- adjust if you rename the repo

const nextConfig = {
  reactStrictMode: true,
  // Only turn on static export + base/asset prefixes for GitHub Pages builds
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
