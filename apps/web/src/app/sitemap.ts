import type { MetadataRoute } from "next";

import { getIndexableSitemapEntries, isCanonicalDeployment } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isCanonicalDeployment()) {
    return [];
  }

  return getIndexableSitemapEntries();
}
