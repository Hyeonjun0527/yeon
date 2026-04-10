import type { NextConfig } from "next";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";

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

export default withSentryConfig(nextConfig, {
  // Sentry 소스맵 업로드 (프로덕션 빌드 시에만 동작)
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  webpack: {
    // 자동 instrumentation 비활성화 (instrumentation.ts에서 수동 설정)
    autoInstrumentServerFunctions: false,
  },
});
