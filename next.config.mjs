/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb"
    },
    outputFileTracingIncludes: {
      "/api/admin/applications/[id]/generate": [
        "./node_modules/@sparticuz/chromium/bin/**/*",
        "./public/fonts/**/*"
      ],
      "/api/admin/generate-documents": [
        "./node_modules/@sparticuz/chromium/bin/**/*",
        "./public/fonts/**/*"
      ]
    }
  }
};

export default nextConfig;
