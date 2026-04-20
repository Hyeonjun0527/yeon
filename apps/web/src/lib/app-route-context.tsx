"use client";

import {
  createContext,
  useContext,
  type PropsWithChildren,
  useMemo,
} from "react";
import {
  DEFAULT_HOME_BASE_PATH,
  normalizeAppPathnameForBasePath,
  resolveApiHrefForBasePath,
  resolveAppHrefForBasePath,
} from "@/lib/app-route-paths";

type AppRouteContextValue = {
  appBasePath: string;
  resolveAppHref: (href: string) => string;
  resolveApiHref: (href: string) => string;
  normalizeAppPathname: (pathname: string) => string;
};

const AppRouteContext = createContext<AppRouteContextValue>({
  appBasePath: DEFAULT_HOME_BASE_PATH,
  resolveAppHref: (href) => href,
  resolveApiHref: (href) => href,
  normalizeAppPathname: (pathname) => pathname,
});

export function AppRouteProvider({
  appBasePath = DEFAULT_HOME_BASE_PATH,
  children,
}: PropsWithChildren<{ appBasePath?: string }>) {
  const value = useMemo<AppRouteContextValue>(() => {
    return {
      appBasePath,
      resolveAppHref: (href) => resolveAppHrefForBasePath(appBasePath, href),
      resolveApiHref: (href) => resolveApiHrefForBasePath(appBasePath, href),
      normalizeAppPathname: (pathname) =>
        normalizeAppPathnameForBasePath(appBasePath, pathname),
    };
  }, [appBasePath]);

  return (
    <AppRouteContext.Provider value={value}>
      {children}
    </AppRouteContext.Provider>
  );
}

export function useAppRoute() {
  return useContext(AppRouteContext);
}
