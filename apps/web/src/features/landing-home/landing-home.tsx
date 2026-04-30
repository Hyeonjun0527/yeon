"use client";

import { useCallback, useEffect, useState } from "react";
import type { DevLoginOption } from "@/lib/auth/dev-login-options";
import type { PlatformServiceDescriptor } from "@/lib/platform-services";
import {
  platformServiceAccessPolicies,
  platformServiceStatuses,
} from "@/lib/platform-services";
import { SITE_BRAND_NAME, SITE_SUPPORT_EMAIL } from "@/lib/site-brand";
import { LoginModal } from "./login-modal";

type LandingHomeProps = {
  nextPath: string;
  initialLoginModalOpen?: boolean;
  devLoginOptions: DevLoginOption[];
  services: readonly PlatformServiceDescriptor[];
  isAuthenticated: boolean;
};

export function LandingHome({
  nextPath,
  initialLoginModalOpen = false,
  devLoginOptions,
  services,
  isAuthenticated,
}: LandingHomeProps) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(
    initialLoginModalOpen,
  );
  const [loginNextPath, setLoginNextPath] = useState(nextPath);

  useEffect(() => {
    setLoginNextPath(nextPath);
  }, [nextPath]);

  const handleLoginModalOpen = useCallback(
    (targetNextPath: string = nextPath) => {
      setLoginNextPath(targetNextPath);
      setIsLoginModalOpen(true);
    },
    [nextPath],
  );

  const handleLoginModalClose = useCallback(() => {
    setIsLoginModalOpen(false);
  }, []);

  return (
    <>
      <LoginModal
        open={isLoginModalOpen}
        onClose={handleLoginModalClose}
        nextPath={loginNextPath}
        devLoginOptions={devLoginOptions}
      />

      <div className="relative min-h-screen overflow-hidden bg-[#1c1f3d] text-white">
        {/* 배경 그라디언트 레이어 */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 120% 80% at 50% -5%, rgba(129,140,248,0.55) 0%, transparent 65%), radial-gradient(ellipse 60% 50% at 90% 100%, rgba(52,211,153,0.20) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 5% 80%, rgba(129,140,248,0.18) 0%, transparent 55%)",
          }}
        />
        {/* 도트 그리드 */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <nav className="relative z-10 flex items-center justify-between border-b border-white/8 px-6 py-4 md:px-12">
          <span className="text-[15px] font-bold tracking-[-0.02em]">
            {SITE_BRAND_NAME}
          </span>
          {isAuthenticated ? (
            <a
              href="/counseling-service"
              className="rounded-md border border-white/15 bg-white/6 px-4 py-2 text-[13px] font-medium text-white/85 no-underline transition-colors hover:bg-white/12"
            >
              서비스 바로가기
            </a>
          ) : (
            <button
              type="button"
              className="rounded-md border border-white/15 bg-white/6 px-4 py-2 text-[13px] font-medium text-white/85 transition-colors hover:bg-white/12"
              onClick={() => handleLoginModalOpen(nextPath)}
            >
              로그인
            </button>
          )}
        </nav>

        <main className="relative z-10 mx-auto max-w-[900px] px-6 py-16 md:px-12 md:py-24">
          <div className="mb-10 grid gap-2">
            <h1 className="text-[28px] font-black tracking-[-0.03em] text-white md:text-[36px]">
              서비스를 선택하세요
            </h1>
            <p className="text-[14px] text-white/45">
              yeon.world에서 운영 중인 서비스 목록입니다.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const isLive = service.status === platformServiceStatuses.live;
              const requiresAuth =
                service.accessPolicy ===
                platformServiceAccessPolicies.authRequired;
              const canOpen = isLive && (!requiresAuth || isAuthenticated);
              const needsLogin = isLive && requiresAuth && !isAuthenticated;

              const serviceIcon: Record<string, string> = {
                "counseling-service": "🎙️",
                "typing-service": "⌨️",
                "card-service": "🃏",
              };

              const cardBase =
                "group flex min-w-0 flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] md:gap-5 md:p-6";
              const cardInner = (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[22px]">
                      {serviceIcon[service.slug] ?? "◻️"}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        isLive
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-white/8 text-white/30"
                      }`}
                    >
                      {isLive ? "운영 중" : "준비 중"}
                    </span>
                  </div>
                  <div className="grid min-w-0 gap-1.5">
                    <h2 className="break-keep text-[18px] font-bold leading-snug tracking-[-0.02em] text-white md:text-[17px] md:leading-tight">
                      {service.title}
                    </h2>
                    <p className="break-keep text-[14px] leading-6 text-white/50 md:text-[13px] md:leading-relaxed">
                      {service.summary}
                    </p>
                  </div>
                  <span className="w-fit break-keep rounded-md bg-white/6 px-2.5 py-1 text-[11px] text-white/35">
                    {service.audience}
                  </span>
                </>
              );

              if (canOpen) {
                return (
                  <a
                    key={service.slug}
                    href={service.href}
                    className={`${cardBase} no-underline`}
                  >
                    {cardInner}
                  </a>
                );
              }
              if (needsLogin) {
                return (
                  <button
                    key={service.slug}
                    type="button"
                    className={cardBase}
                    onClick={() => handleLoginModalOpen(service.href)}
                  >
                    {cardInner}
                  </button>
                );
              }
              return (
                <div
                  key={service.slug}
                  className="flex min-w-0 flex-col gap-4 rounded-2xl border border-white/6 bg-white/[0.02] p-5 opacity-50 md:gap-5 md:p-6"
                >
                  {cardInner}
                </div>
              );
            })}
          </div>
        </main>

        <footer className="relative z-10 border-t border-white/8 px-6 py-6 md:px-12">
          <div className="mx-auto flex max-w-[720px] flex-wrap items-center justify-between gap-4">
            <span className="text-[12px] text-white/30">
              &copy; 2026 {SITE_BRAND_NAME}
            </span>
            <div className="flex gap-4">
              <a
                href="/privacy"
                className="text-[12px] text-white/35 no-underline hover:text-white/60"
              >
                개인정보처리방침
              </a>
              <a
                href="/terms"
                className="text-[12px] text-white/35 no-underline hover:text-white/60"
              >
                이용약관
              </a>
              <a
                href={`mailto:${SITE_SUPPORT_EMAIL}`}
                className="text-[12px] text-white/35 no-underline hover:text-white/60"
              >
                {SITE_SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
