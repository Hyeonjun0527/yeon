import type { ReactNode } from "react";
import { QueryProvider } from "@/lib/query-provider";

export default function PublicCheckLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <QueryProvider>
      <div className="app-theme min-h-screen bg-bg text-text font-sans leading-relaxed antialiased [font-family:'Noto_Sans_KR',-apple-system,BlinkMacSystemFont,sans-serif]">
        {children}
      </div>
    </QueryProvider>
  );
}
