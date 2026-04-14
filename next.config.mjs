/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb"
    },
    outputFileTracingIncludes: {
      "/api/admin/applications/[id]/generate": ["./node_modules/@sparticuz/chromium/bin/**/*"],
      "/api/admin/generate-documents": ["./node_modules/@sparticuz/chromium/bin/**/*"]
    }
  }
};

export default nextConfig;
