/** @type {import('next').NextConfig} */
module.exports = {
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  output: 'export',
  // Replace 'your-repo-name' with your actual repository name
  basePath: process.env.NODE_ENV === 'production' ? '/audiobook-splitter' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/audiobook-splitter/' : '',
};