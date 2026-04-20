"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import CounselingServicePage from "@/app/counseling-service/page";
import { createPatchedHref } from "@/lib/route-state/search-params";

export default function MockdataAppPage() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    if (searchParams.get("spaceId") && searchParams.get("recordId")) {
      return;
    }

    router.replace(
      createPatchedHref(pathname, searchParams, {
        spaceId: searchParams.get("spaceId") ?? "space-7",
        recordId: searchParams.get("recordId") ?? "rec-1",
      }),
    );
  }, [pathname, router]);

  return <CounselingServicePage />;
}
