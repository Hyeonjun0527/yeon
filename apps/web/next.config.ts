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
};

export default nextConfig;
