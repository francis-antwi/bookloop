/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "lh3.googleusercontent.com",
      "res.cloudinary.com"
    ]
  },
  
  eslint: {
    ignoreDuringBuilds: true, // Disables ESLint during builds
  },

  typescript: {
    ignoreBuildErrors: true, // Disables TypeScript type errors during builds
  },
};

export default nextConfig;
