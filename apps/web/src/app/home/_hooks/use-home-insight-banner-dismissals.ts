"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DismissHomeInsightBannerResponse,
  HomeInsightBannerDismissal,
  HomeInsightBannerKey,
  HomeInsightBannerStateResponse,
} from "@yeon/api-contract";
import {
  dismissHomeInsightBannerResponseSchema,
  homeInsightBannerStateResponseSchema,
} from "@yeon/api-contract";
import { resolveApiHrefForCurrentPath } from "@/lib/app-route-paths";

const HOME_INSIGHT_BANNER_DISMISSALS_QUERY_KEY = [
  "home-insight-banner-dismissals",
] as const;

function toTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function applyDismissalToState(
  current: HomeInsightBannerStateResponse | undefined,
  nextDismissal: HomeInsightBannerDismissal,
): HomeInsightBannerStateResponse {
  const existing = current ? current.dismissals : [];
  const nextDismissals = new Map<
    HomeInsightBannerKey,
    HomeInsightBannerDismissal
  >(existing.map((dismissal) => [dismissal.bannerKey, dismissal]));

  nextDismissals.set(nextDismissal.bannerKey, nextDismissal);

  return {
    dismissals: Array.from(nextDismissals.values()),
  };
}

export function useHomeInsightBannerDismissals() {
  const queryClient = useQueryClient();
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());
  const query = useQuery({
    queryKey: HOME_INSIGHT_BANNER_DISMISSALS_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch(
        resolveApiHrefForCurrentPath("/api/v1/home/insight-banners"),
      );
      const payload = (await response.json().catch(() => null)) as
        | ({ message?: string } & Partial<HomeInsightBannerStateResponse>)
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.message || "홈 인사이트 배너 상태를 불러오지 못했습니다.",
        );
      }

      return homeInsightBannerStateResponseSchema.parse(payload);
    },
  });
  const dismissals = query.data ? query.data.dismissals : null;

  const hiddenUntilByBanner = useMemo(() => {
    if (!dismissals) {
      return new Map<HomeInsightBannerKey, number>();
    }

    return new Map<HomeInsightBannerKey, number>(
      dismissals
        .map((dismissal) => [
          dismissal.bannerKey,
          toTimestamp(dismissal.hiddenUntil),
        ])
        .filter(
          (entry): entry is [HomeInsightBannerKey, number] => entry[1] !== null,
        ),
    );
  }, [dismissals]);

  useEffect(() => {
    const nextVisibleAt = Math.min(
      ...Array.from(hiddenUntilByBanner.values()).filter(
        (hiddenUntil) => hiddenUntil > nowTimestamp,
      ),
    );

    if (!Number.isFinite(nextVisibleAt)) {
      return;
    }

    const timeout = window.setTimeout(
      () => {
        setNowTimestamp(Date.now());
      },
      Math.max(0, nextVisibleAt - nowTimestamp) + 50,
    );

    return () => window.clearTimeout(timeout);
  }, [hiddenUntilByBanner, nowTimestamp]);

  const dismissMutation = useMutation({
    mutationFn: async (
      bannerKey: HomeInsightBannerKey,
    ): Promise<DismissHomeInsightBannerResponse> => {
      const response = await fetch(
        resolveApiHrefForCurrentPath("/api/v1/home/insight-banners"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bannerKey }),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | ({ message?: string } & Partial<DismissHomeInsightBannerResponse>)
        | null;

      if (!response.ok) {
        throw new Error(payload?.message || "배너를 닫지 못했습니다.");
      }

      return dismissHomeInsightBannerResponseSchema.parse(payload);
    },
    onSuccess: (result) => {
      setNowTimestamp(Date.now());
      queryClient.setQueryData<HomeInsightBannerStateResponse | undefined>(
        HOME_INSIGHT_BANNER_DISMISSALS_QUERY_KEY,
        (current) => applyDismissalToState(current, result.dismissal),
      );
    },
  });

  return {
    isPending: query.isPending && !query.data,
    isError: query.isError,
    dismissBanner: dismissMutation.mutate,
    isBannerHidden: (bannerKey: HomeInsightBannerKey) =>
      (hiddenUntilByBanner.get(bannerKey) ?? 0) > nowTimestamp,
    isBannerDismissing: (bannerKey: HomeInsightBannerKey) =>
      dismissMutation.isPending && dismissMutation.variables === bannerKey,
  };
}
