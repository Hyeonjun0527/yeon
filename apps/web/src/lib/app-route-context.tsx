"use client";

import {
  createContext,
  useContext,
  type PropsWithChildren,
  useMemo,
} from "react";

type AppRouteContextValue = {
  appBasePath: string;
  resolveAppHref: (href: string) => string;
  normalizeAppPathname: (pathname: string) => string;
};

const DEFAULT_HOME_BASE_PATH = "/home";

const AppRouteContext = createContext<AppRouteContextValue>({
  appBasePath: DEFAULT_HOME_BASE_PATH,
  resolveAppHref: (href) => href,
  normalizeAppPathname: (pathname) => pathname,
});

export function AppRouteProvider({
  appBasePath = DEFAULT_HOME_BASE_PATH,
  children,
}: PropsWithChildren<{ appBasePath?: string }>) {
  const value = useMemo<AppRouteContextValue>(() => {
    const resolveAppHref = (href: string) => {
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
    };

    const normalizeAppPathname = (pathname: string) => {
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
    };

    return {
      appBasePath,
      resolveAppHref,
      normalizeAppPathname,
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
