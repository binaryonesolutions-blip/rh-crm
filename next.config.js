/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer needs to run only on the client
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  },
}

module.exports = nextConfig
