import type { MetadataRoute } from "next";

import {
  buildCanonicalUrl,
  getCanonicalSite,
  isCanonicalDeployment,
} from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (!isCanonicalDeployment()) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/typing-service", "/privacy", "/terms"],
      disallow: [
        "/api/",
        "/api/auth/",
        "/auth/",
        "/check/",
        "/landing",
        "/contest",
        "/mockdata/",
        "/legacy-counseling-records",
        "/counseling-service",
      ],
    },
    sitemap: buildCanonicalUrl("/sitemap.xml"),
    host: getCanonicalSite().origin,
  };
}
