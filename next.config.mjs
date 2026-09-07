/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer ships CJS with dynamic requires; bundling it into the
  // server build breaks font registration, so keep it external.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
