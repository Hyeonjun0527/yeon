import { getPlatformServiceByPathname } from "@/lib/platform-services";

export const DEFAULT_HOME_BASE_PATH = "/home";
const ROOT_API_BASE_PATH = "/api";

export function resolveAppHrefForBasePath(appBasePath: string, href: string) {
  if (appBasePath === DEFAULT_HOME_BASE_PATH) {
    return href;
  }

  if (href === DEFAULT_HOME_BASE_PATH) {
    return appBasePath;
  }

  if (
    href.startsWith(`${DEFAULT_HOME_BASE_PATH}?`) ||
    href.startsWith(`${DEFAULT_HOME_BASE_PATH}#`)
  ) {
    return `${appBasePath}${href.slice(DEFAULT_HOME_BASE_PATH.length)}`;
  }

  if (href.startsWith(`${DEFAULT_HOME_BASE_PATH}/`)) {
    return `${appBasePath}${href.slice(DEFAULT_HOME_BASE_PATH.length)}`;
  }

  return href;
}

export function normalizeAppPathnameForBasePath(
  appBasePath: string,
  pathname: string,
) {
  if (appBasePath === DEFAULT_HOME_BASE_PATH) {
    return pathname;
  }

  if (pathname === appBasePath) {
    return DEFAULT_HOME_BASE_PATH;
  }

  if (pathname.startsWith(`${appBasePath}/`)) {
    return `${DEFAULT_HOME_BASE_PATH}${pathname.slice(appBasePath.length)}`;
  }

  return pathname;
}

export function resolveApiHrefForBasePath(appBasePath: string, href: string) {
  if (appBasePath === DEFAULT_HOME_BASE_PATH) {
    return href;
  }

  if (href === ROOT_API_BASE_PATH) {
    return `${appBasePath}${ROOT_API_BASE_PATH}`;
  }

  if (
    href.startsWith(`${ROOT_API_BASE_PATH}?`) ||
    href.startsWith(`${ROOT_API_BASE_PATH}#`) ||
    href.startsWith(`${ROOT_API_BASE_PATH}/`)
  ) {
    return `${appBasePath}${href}`;
  }

  return href;
}

export function getAppBasePathFromPathname(pathname: string) {
  return getPlatformServiceByPathname(pathname)?.href ?? DEFAULT_HOME_BASE_PATH;
}

export function resolveApiHrefForPathname(pathname: string, href: string) {
  return resolveApiHrefForBasePath(getAppBasePathFromPathname(pathname), href);
}

export function resolveApiHrefForCurrentPath(href: string) {
  if (typeof window === "undefined") {
    return href;
  }

  return resolveApiHrefForPathname(window.location.pathname, href);
}
