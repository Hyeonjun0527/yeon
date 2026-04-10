"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
  nextPath: string;
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

export function LoginModal({ open, onClose, nextPath }: LoginModalProps) {
  const [pendingProvider, setPendingProvider] = useState<
    "google" | "kakao" | null
  >(null);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      setPendingProvider(null);
      return;
    }

    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  const kakaoLoginHref = `/api/auth/kakao?next=${encodeURIComponent(nextPath)}`;
  const googleLoginHref = `/api/auth/google?next=${encodeURIComponent(nextPath)}`;

  function moveToSocialLogin(provider: "google" | "kakao", href: string) {
    setPendingProvider(provider);
    window.location.assign(href);
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-20 flex items-center justify-center p-6 bg-[rgba(12,14,18,0.36)] backdrop-blur-[6px] md:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            id="landing-login-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="landing-login-title"
            className="w-[min(100%,560px)] p-9 rounded-[32px] border border-[rgba(17,19,24,0.08)] bg-gradient-to-b from-[#fffdf9] to-[#faf7f1] text-[#111318] shadow-[0_28px_80px_rgba(15,18,24,0.18)] md:p-[22px]"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
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
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
