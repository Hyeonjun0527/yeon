import type { ReactNode } from "react";

import { CounselingNavShell } from "@/features/counseling-service-shell/counseling-nav-shell";
import { MockDemoProvider } from "./_lib/mock-demo-provider";
import { AppRouteProvider } from "@/lib/app-route-context";
import { QueryProvider } from "@/lib/query-provider";

export default function MockdataAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <QueryProvider>
      <AppRouteProvider appBasePath="/mockdata/app">
        <MockDemoProvider>
          <div className="app-theme h-screen overflow-hidden bg-bg text-text font-sans leading-relaxed antialiased [font-family:'Noto_Sans_KR',-apple-system,BlinkMacSystemFont,sans-serif]">
            <div className="flex h-full flex-col">
              <CounselingNavShell>{children}</CounselingNavShell>
            </div>
          </div>
        </MockDemoProvider>
      </AppRouteProvider>
    </QueryProvider>
  );
}
