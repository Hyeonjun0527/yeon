import type { Metadata } from "next";
import type { ReactNode } from "react";

import { CardServiceAuthProvider } from "@/features/card-service/auth-context";
import { QueryProvider } from "@/lib/query-provider";
import { NON_INDEXABLE_ROBOTS } from "@/lib/seo";
import { getCurrentAuthUser } from "@/server/auth/session";

export const metadata: Metadata = {
  robots: NON_INDEXABLE_ROBOTS,
};

export default async function CardServiceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentAuthUser();
  return (
    <QueryProvider>
      <CardServiceAuthProvider isAuthenticated={Boolean(user)}>
        {children}
      </CardServiceAuthProvider>
    </QueryProvider>
  );
}
