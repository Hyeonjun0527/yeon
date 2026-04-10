import type { ReactNode } from "react";
import { HomeNavShell } from "./_components/home-nav-shell";

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-theme min-h-screen bg-bg text-text font-sans leading-relaxed antialiased [font-family:'Noto_Sans_KR',-apple-system,BlinkMacSystemFont,sans-serif]">
      <div className="flex flex-col" style={{ minHeight: "100vh" }}>
        <HomeNavShell>{children}</HomeNavShell>
      </div>
    </div>
  );
}
