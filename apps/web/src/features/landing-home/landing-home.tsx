"use client";

import { useCallback, useEffect, useState } from "react";
import type { DevLoginOption } from "@/lib/auth/dev-login-options";
import type { PlatformServiceDescriptor } from "@/lib/platform-services";
import {
  platformServiceAccessPolicies,
  platformServiceStatuses,
} from "@/lib/platform-services";
import {
  SITE_BRAND_NAME,
  SITE_SUPPORT_EMAIL,
} from "@/lib/site-brand";
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

      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <nav className="flex items-center justify-between border-b border-white/8 px-6 py-4 md:px-12">
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

        <main className="mx-auto max-w-[720px] px-6 py-16 md:px-12 md:py-24">
          <div className="grid gap-3">
            {services.map((service) => {
              const isLive =
                service.status === platformServiceStatuses.live;
              const requiresAuth =
                service.accessPolicy ===
                platformServiceAccessPolicies.authRequired;
              const canOpen = isLive && (!requiresAuth || isAuthenticated);
              const needsLogin = isLive && requiresAuth && !isAuthenticated;

              return (
                <div
                  key={service.slug}
                  className="flex items-center justify-between gap-4 rounded-lg border border-white/8 px-5 py-4"
                >
                  <div className="grid gap-0.5">
                    <span className="text-[15px] font-semibold text-white">
                      {service.title}
                    </span>
                    <span className="text-[12px] text-white/45">
                      {service.summary}
                    </span>
                  </div>

                  {canOpen ? (
                    <a
                      href={service.href}
                      className="shrink-0 rounded-md border border-white/15 bg-white/6 px-4 py-2 text-[13px] font-medium text-white no-underline transition-colors hover:bg-white/12"
                    >
                      열기
                    </a>
                  ) : needsLogin ? (
                    <button
                      type="button"
                      className="shrink-0 rounded-md border border-white/15 bg-white/6 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/12"
                      onClick={() => handleLoginModalOpen(service.href)}
                    >
                      로그인
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-md border border-white/8 px-4 py-2 text-[13px] text-white/30">
                      준비 중
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </main>

        <footer className="border-t border-white/8 px-6 py-6 md:px-12">
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
