import type { ReactNode } from "react";
import { HomeNavShell } from "./_components/home-nav-shell";
import { QueryProvider } from "@/lib/query-provider";

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <div className="app-theme h-screen overflow-hidden bg-bg text-text font-sans leading-relaxed antialiased [font-family:'Noto_Sans_KR',-apple-system,BlinkMacSystemFont,sans-serif]">
        <div className="flex flex-col h-full">
          <HomeNavShell>{children}</HomeNavShell>
        </div>
      </div>
    </QueryProvider>
  );
}
