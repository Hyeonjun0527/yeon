import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: [
    "@yeon/api-contract",
    "@splinetool/react-spline",
    "@splinetool/runtime",
  ],
  serverExternalPackages: ["@aws-sdk/client-s3", "@aws-sdk/lib-storage"],
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
