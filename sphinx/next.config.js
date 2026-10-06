module.exports={reactStrictMode:true,transpilePackages:['three']};
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // يتجاهل أخطاء TS أثناء الـ build على Vercel
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
