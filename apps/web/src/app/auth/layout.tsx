import type { ReactNode } from "react";

import { QueryProvider } from "@/lib/query-provider";

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return <QueryProvider>{children}</QueryProvider>;
}
