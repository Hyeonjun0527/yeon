"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";

import type { DevLoginOption } from "@/lib/auth/dev-login-options";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
  nextPath: string;
  devLoginOptions: DevLoginOption[];
};

function KakaoTalkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="w-[22px] h-[22px] inline-flex shrink-0 text-[rgba(25,25,25,0.9)]"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M12 3.5C6.74 3.5 2.5 6.73 2.5 10.76c0 2.53 1.67 4.77 4.22 6.03l-1.02 3.77c-.09.34.27.61.57.43l4.41-2.93c.43.05.87.08 1.32.08 5.25 0 9.5-3.23 9.5-7.38S17.25 3.5 12 3.5Z"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="w-5 h-5 inline-flex shrink-0"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.82-.07-1.41-.22-2.03H12v3.71h5.5c-.11.92-.73 2.31-2.1 3.24l-.02.12 3 2.28.21.02c1.93-1.75 3.03-4.31 3.03-7.34Z"
      />
      <path
        fill="#34A853"
        d="M12 21.9c2.7 0 4.97-.87 6.63-2.33l-3.16-2.42c-.85.58-1.99.99-3.47.99-2.65 0-4.89-1.75-5.69-4.15l-.11.01-3.12 2.37-.04.1c1.64 3.18 4.99 5.43 8.96 5.43Z"
      />
      <path
        fill="#FBBC05"
        d="M6.31 13.99A6.02 6.02 0 0 1 5.98 12c0-.69.12-1.35.31-1.99l-.01-.13-3.16-2.4-.1.05A9.8 9.8 0 0 0 2 12c0 1.62.39 3.15 1.08 4.47l3.23-2.48Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.86c1.86 0 3.12.79 3.84 1.45l2.8-2.68C16.96 3.09 14.7 2.1 12 2.1c-3.97 0-7.32 2.25-8.96 5.43l3.27 2.48C7.11 7.61 9.35 5.86 12 5.86Z"
      />
    </svg>
  );
}

function getProviderLabel(providers: DevLoginOption["providers"]) {
  return providers
    .map((provider) => {
      if (provider === "google") {
        return "구글";
      }

      if (provider === "kakao") {
        return "카카오";
      }

      return "개발";
    })
    .join(" · ");
}

export function LoginModal({
  open,
  onClose,
  nextPath,
  devLoginOptions,
}: LoginModalProps) {
  const [pendingProvider, setPendingProvider] = useState<
    "google" | "kakao" | "dev-login" | "dev-create" | null
  >(null);
  const [selectedDevLoginAccount, setSelectedDevLoginAccount] = useState(
    devLoginOptions[0]?.accountKey ?? "",
  );
  const prefersReducedMotion = useReducedMotion();
  const hasDevLoginOptions = devLoginOptions.length > 0;
  const selectedDevLoginOption =
    devLoginOptions.find(
      (option) => option.accountKey === selectedDevLoginAccount,
    ) ?? devLoginOptions[0];

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      document.body.classList.remove("landing-login-open");
      setPendingProvider(null);
      setSelectedDevLoginAccount(devLoginOptions[0]?.accountKey ?? "");
      return;
    }

    document.body.style.overflow = "hidden";
    document.body.classList.add("landing-login-open");

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("landing-login-open");
      window.removeEventListener("keydown", handleEscape);
    };
  }, [devLoginOptions, onClose, open]);

  useEffect(() => {
    if (!selectedDevLoginAccount && devLoginOptions[0]) {
      setSelectedDevLoginAccount(devLoginOptions[0].accountKey);
    }
  }, [devLoginOptions, selectedDevLoginAccount]);

  const kakaoLoginHref = `/api/auth/kakao?next=${encodeURIComponent(nextPath)}`;
  const googleLoginHref = `/api/auth/google?next=${encodeURIComponent(nextPath)}`;
  const backdropTransition = prefersReducedMotion
    ? { duration: 0.01 }
    : { duration: 0.14, ease: "easeOut" as const };
  const modalTransition = prefersReducedMotion
    ? { duration: 0.01 }
    : { duration: 0.16, ease: [0.16, 1, 0.3, 1] as const };
  const modalInitial = prefersReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, y: 12, scale: 0.985 };
  const modalAnimate = prefersReducedMotion
    ? { opacity: 1 }
    : { opacity: 1, y: 0, scale: 1 };
  const modalExit = prefersReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, y: 8, scale: 0.99 };

  function moveToSocialLogin(provider: "google" | "kakao", href: string) {
    setPendingProvider(provider);
    window.location.assign(href);
  }

  function moveToDevLogin() {
    if (!selectedDevLoginAccount) {
      return;
    }

    setPendingProvider("dev-login");

    const searchParams = new URLSearchParams({
      account: selectedDevLoginAccount,
      next: nextPath,
    });

    window.location.assign(`/api/auth/dev-login?${searchParams.toString()}`);
  }

  function createDevLoginAccount() {
    setPendingProvider("dev-create");

    const searchParams = new URLSearchParams({
      create: "1",
      next: nextPath,
    });

    window.location.assign(`/api/auth/dev-login?${searchParams.toString()}`);
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-20 flex items-center justify-center bg-[rgba(8,10,14,0.82)] p-6 md:p-4"
          style={{ willChange: "opacity" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={backdropTransition}
          onClick={onClose}
        >
          <motion.div
            id="landing-login-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="landing-login-title"
            className="w-[min(100%,560px)] rounded-[32px] border border-[rgba(17,19,24,0.08)] bg-gradient-to-b from-[#fffdf9] to-[#faf7f1] p-9 text-[#111318] shadow-[0_28px_80px_rgba(15,18,24,0.18)] md:p-[22px]"
            style={{
              willChange: "transform, opacity",
              transform: "translateZ(0)",
            }}
            initial={modalInitial}
            animate={modalAnimate}
            exit={modalExit}
            transition={modalTransition}
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header */}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-6">
              <div className="grid gap-3">
                <h2
                  id="landing-login-title"
                  className="m-0 text-[clamp(24px,3vw,34px)] font-black leading-[1.08] tracking-[-0.04em] text-[#111318]"
                >
                  회원가입 없이 시작해요
                </h2>
                <p className="m-0 text-[14px] leading-[1.6] text-[#626b79]">
                  상담 기록 워크스페이스를 바로 열 수 있어요.
                </p>
              </div>

              <button
                type="button"
                className="w-12 h-12 border border-[rgba(17,19,24,0.08)] rounded-full bg-[rgba(17,19,24,0.04)] text-[#2b313d] inline-flex items-center justify-center cursor-pointer transition-[border-color,background-color,color] duration-[220ms] ease-in-out hover:border-[rgba(17,19,24,0.14)] hover:bg-[rgba(17,19,24,0.08)] hover:text-[#111318]"
                onClick={onClose}
                aria-label="로그인 모달 닫기"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>

            {/* Body */}
            <div className="grid gap-3 mt-[30px]">
              <div className="grid gap-[10px]">
                <button
                  type="button"
                  className="w-full min-h-16 rounded-[18px] inline-flex items-center justify-center gap-3 px-5 text-[17px] font-black tracking-[-0.02em] cursor-pointer transition-[transform,box-shadow,filter,opacity] duration-[220ms] ease-in-out border-0 bg-[#fee500] text-[#191919] disabled:cursor-not-allowed disabled:opacity-100 hover:enabled:-translate-y-px hover:enabled:shadow-[0_16px_28px_rgba(77,64,0,0.18)]"
                  disabled={pendingProvider !== null}
                  onClick={() => moveToSocialLogin("kakao", kakaoLoginHref)}
                >
                  <KakaoTalkIcon />
                  {pendingProvider === "kakao"
                    ? "카카오로 이동하는 중..."
                    : "카카오 로그인"}
                </button>

                <button
                  type="button"
                  className="w-full min-h-16 rounded-[18px] inline-flex items-center justify-center gap-3 px-5 text-[17px] font-black tracking-[-0.02em] cursor-pointer transition-[transform,box-shadow,filter,opacity] duration-[220ms] ease-in-out border border-[rgba(17,19,24,0.1)] bg-white text-[#111318] disabled:cursor-not-allowed disabled:opacity-100 hover:enabled:-translate-y-px hover:enabled:shadow-[0_14px_24px_rgba(17,19,24,0.08)]"
                  disabled={pendingProvider !== null}
                  onClick={() => moveToSocialLogin("google", googleLoginHref)}
                >
                  <GoogleIcon />
                  {pendingProvider === "google"
                    ? "구글로 이동하는 중..."
                    : "구글 로그인"}
                </button>
              </div>
              <p className="m-0 text-[12px] leading-[1.55] tracking-[-0.01em] text-[#626b79]">
                카카오 로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의한
                것으로 간주됩니다.
              </p>

              {hasDevLoginOptions ? (
                <div className="mt-2 grid gap-3 rounded-[22px] border border-[rgba(17,19,24,0.08)] bg-[rgba(17,19,24,0.03)] p-4">
                  <div className="grid gap-1">
                    <p className="m-0 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a818d]">
                      로컬 개발 전용
                    </p>
                    <p className="m-0 text-[13px] leading-[1.55] text-[#4b5563]">
                      운영자 테스트용으로 원하는 계정 세션을 바로 발급합니다.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <div className="relative">
                      <select
                        className="h-12 w-full appearance-none rounded-[14px] border border-[rgba(17,19,24,0.12)] bg-white px-4 pr-10 text-[14px] font-semibold text-[#111318] outline-none transition-colors duration-[180ms] ease-out hover:border-[rgba(17,19,24,0.2)] focus:border-[#111318]"
                        aria-label="테스트 로그인 계정 선택"
                        disabled={pendingProvider !== null}
                        value={selectedDevLoginAccount}
                        onChange={(event) =>
                          setSelectedDevLoginAccount(event.target.value)
                        }
                      >
                        {devLoginOptions.map((option) => (
                          <option
                            key={option.accountKey}
                            value={option.accountKey}
                          >
                            {option.displayName
                              ? `${option.displayName} · ${option.email}`
                              : option.email}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a818d]" />
                    </div>

                    <button
                      type="button"
                      className="min-h-12 rounded-[14px] bg-[#111318] px-4 text-[14px] font-bold tracking-[-0.01em] text-white transition-[transform,background-color,opacity] duration-[180ms] ease-out hover:enabled:-translate-y-px hover:enabled:bg-[#1a1f28] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={
                        pendingProvider !== null || !selectedDevLoginAccount
                      }
                      onClick={moveToDevLogin}
                    >
                      {pendingProvider === "dev-login"
                        ? "테스트 로그인 중..."
                        : "선택 계정으로 로그인"}
                    </button>

                    <button
                      type="button"
                      className="min-h-12 rounded-[14px] border border-[rgba(17,19,24,0.12)] bg-white px-4 text-[14px] font-bold tracking-[-0.01em] text-[#111318] transition-[transform,border-color,background-color,opacity] duration-[180ms] ease-out hover:enabled:-translate-y-px hover:enabled:border-[rgba(17,19,24,0.22)] hover:enabled:bg-[rgba(17,19,24,0.03)] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={pendingProvider !== null}
                      onClick={createDevLoginAccount}
                    >
                      {pendingProvider === "dev-create"
                        ? "생성 중..."
                        : "새 계정 생성 후 로그인"}
                    </button>
                  </div>

                  {selectedDevLoginOption ? (
                    <p className="m-0 text-[12px] leading-[1.55] tracking-[-0.01em] text-[#626b79]">
                      {selectedDevLoginOption.email} ·{" "}
                      {getProviderLabel(selectedDevLoginOption.providers)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
