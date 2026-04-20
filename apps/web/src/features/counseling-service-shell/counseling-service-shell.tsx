import type { ReactNode } from "react";

import { HomeNavShell } from "@/app/home/_components/home-nav-shell";
import { AppRouteProvider } from "@/lib/app-route-context";
import { QueryProvider } from "@/lib/query-provider";

type CounselingServiceShellProps = {
  appBasePath: string;
  children: ReactNode;
};

export function CounselingServiceShell({
  appBasePath,
  children,
}: CounselingServiceShellProps) {
  return (
    <QueryProvider>
      <AppRouteProvider appBasePath={appBasePath}>
        <div className="app-theme h-screen overflow-hidden bg-bg text-text font-sans leading-relaxed antialiased [font-family:'Noto_Sans_KR',-apple-system,BlinkMacSystemFont,sans-serif]">
          <div className="flex h-full flex-col">
            <HomeNavShell>{children}</HomeNavShell>
          </div>
        </div>
      </AppRouteProvider>
    </QueryProvider>
  );
}
