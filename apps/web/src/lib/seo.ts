import type { Metadata, MetadataRoute } from "next";

export const CANONICAL_SITE_URL = "https://yeon.world";

const DEFAULT_APP_URL = CANONICAL_SITE_URL;
const WWW_SITE_HOSTNAME = "www.yeon.world";
const DEV_SITE_HOSTNAME = "dev.yeon.world";

export const NOINDEX_X_ROBOTS_TAG_VALUE = "noindex, nofollow";

export const NON_INDEXABLE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
};

export const INDEXABLE_SITEMAP_ENTRIES = [
  {
    pathname: "/",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    pathname: "/typing-service",
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    pathname: "/privacy",
    changeFrequency: "yearly",
    priority: 0.2,
  },
  {
    pathname: "/terms",
    changeFrequency: "yearly",
    priority: 0.2,
  },
] as const satisfies readonly {
  pathname: string;
  changeFrequency: NonNullable<
    MetadataRoute.Sitemap[number]["changeFrequency"]
  >;
  priority: number;
}[];

function parseUrl(rawUrl: string | undefined) {
  try {
    return new URL(rawUrl ?? DEFAULT_APP_URL);
  } catch {
    return new URL(DEFAULT_APP_URL);
  }
}

function normalizeHostname(hostname: string | null | undefined) {
  return hostname?.toLowerCase() ?? "";
}

export function getCanonicalSite() {
  return new URL(CANONICAL_SITE_URL);
}

export function getDeploymentSite() {
  return parseUrl(process.env.NEXT_PUBLIC_APP_URL);
}

export function getSeoMetadataBase() {
  return getCanonicalSite();
}

export function isCanonicalDeployment() {
  return getDeploymentSite().origin === getCanonicalSite().origin;
}

export function isWwwHostname(hostname: string | null | undefined) {
  return normalizeHostname(hostname) === WWW_SITE_HOSTNAME;
}

export function isDevHostname(hostname: string | null | undefined) {
  return normalizeHostname(hostname) === DEV_SITE_HOSTNAME;
}

export function buildCanonicalUrl(pathname: string) {
  return new URL(pathname, getCanonicalSite()).toString();
}

export function getDefaultSiteRobots(): Metadata["robots"] {
  return isCanonicalDeployment()
    ? {
        index: true,
        follow: true,
      }
    : NON_INDEXABLE_ROBOTS;
}

export function getIndexableSitemapEntries(): MetadataRoute.Sitemap {
  return INDEXABLE_SITEMAP_ENTRIES.map((entry) => ({
    url: buildCanonicalUrl(entry.pathname),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
