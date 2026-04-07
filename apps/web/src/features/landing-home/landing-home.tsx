"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  Mic,
  FileText,
  MessageSquare,
  FolderOpen,
  ArrowRight,
  ChevronDown,
  X,
} from "lucide-react";
import { SplineHero } from "./spline-hero";
import { Counter } from "./counter";
import styles from "./landing-home.module.css";

/* ── Data ── */

const STATS = [
  { label: "원문 전체 열람", value: 100, suffix: "%" },
  { label: "요약 기본 구조", value: 4, suffix: "개" },
  { label: "한 화면 작업 영역", value: 3, suffix: "영역" },
] as const;

const FEATURES = [
  {
    icon: Mic,
    title: "고품질 STT 원문",
    description:
      "긴 상담 녹음도 흐름이 끊기지 않게 텍스트로 펼쳐 보여줍니다. 요약 전에 원문을 먼저 확인할 수 있습니다.",
    accent: "orange" as const,
  },
  {
    icon: FileText,
    title: "구조화 상담 요약",
    description:
      "핵심 상담 내용, 학생 문제 포인트, 보호자 요청사항, 다음 액션을 실무형 구조로 나눠 정리합니다.",
    accent: "blue" as const,
  },
  {
    icon: MessageSquare,
    title: "원문 기반 AI 채팅",
    description:
      "선택한 상담 원문을 기준으로 요청사항 추출, 다음 상담 준비, 특정 주제 검색을 빠르게 처리합니다.",
    accent: "green" as const,
  },
  {
    icon: FolderOpen,
    title: "학생별 상담 히스토리",
    description:
      "상담 기록이 학생 단위로 쌓여 이전 약속, 후속 액션, 보호자 요청 맥락을 이어서 볼 수 있습니다.",
    accent: "purple" as const,
  },
] as const;

const FLOW_STEPS = [
  {
    number: "01",
    title: "로그인",
    description: "상담 기록 서비스에 로그인하고 작업 화면을 엽니다.",
  },
  {
    number: "02",
    title: "상담 선택 또는 업로드",
    description: "왼쪽 리스트에서 기존 상담을 고르거나 새 녹음본을 올립니다.",
  },
  {
    number: "03",
    title: "원문과 요약 생성",
    description:
      "STT가 전체 원문을 만들고 AI가 핵심 상담 내용과 다음 액션 초안을 정리합니다.",
  },
  {
    number: "04",
    title: "다음 상담 준비",
    description:
      "가운데 원문을 검토하고 오른쪽 AI 채팅으로 필요한 부분만 다시 묻고 저장합니다.",
  },
] as const;

/* ── Animation Variants ── */

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ── Section Wrapper ── */

function RevealSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <motion.section
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={staggerContainer}
    >
      {children}
    </motion.section>
  );
}

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
      className={styles.kakaoIcon}
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
      className={styles.googleIcon}
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

function LoginModal({ open, onClose, nextPath }: LoginModalProps) {
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
          className={styles.modalOverlay}
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
            className={styles.modalCard}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalCopy}>
                <h2 id="landing-login-title" className={styles.modalTitle}>
                  회원가입 없이 시작해요
                </h2>
                <p className={styles.modalDescription}>
                  상담 기록 워크스페이스를 바로 열 수 있어요.
                </p>
              </div>

              <button
                type="button"
                className={styles.modalClose}
                onClick={onClose}
                aria-label="로그인 모달 닫기"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.loginButtons}>
                <button
                  type="button"
                  className={`${styles.loginButton} ${styles.kakaoButton}`}
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
                  className={`${styles.loginButton} ${styles.googleButton}`}
                  disabled={pendingProvider !== null}
                  onClick={() => moveToSocialLogin("google", googleLoginHref)}
                >
                  <GoogleIcon />
                  {pendingProvider === "google"
                    ? "구글로 이동하는 중..."
                    : "구글 로그인"}
                </button>
              </div>
              <p className={styles.modalHint}>
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

/* ── Main Component ── */

type LandingHomeProps = {
  nextPath: string;
  initialLoginModalOpen?: boolean;
};

export function LandingHome({
  nextPath,
  initialLoginModalOpen = false,
}: LandingHomeProps) {
  const heroRef = useRef(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(
    initialLoginModalOpen,
  );
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  function openLoginModal() {
    setIsLoginModalOpen(true);
  }

  function closeLoginModal() {
    setIsLoginModalOpen(false);
  }

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <LoginModal
        open={isLoginModalOpen}
        onClose={closeLoginModal}
        nextPath={nextPath}
      />
      <div className={styles.landing}>
        {/* ── Hero ── */}
        <section ref={heroRef} className={styles.hero}>
          <motion.div style={{ y: heroY }} className={styles.splineWrap}>
            <SplineHero />
          </motion.div>

          <div className={styles.heroGradient} />

          <motion.div
            className={styles.heroContent}
            style={{ opacity: heroOpacity }}
          >
            <motion.p
              className={styles.heroEyebrow}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              YEON 상담 기록 워크스페이스
            </motion.p>

            <motion.h1
              className={styles.heroTitle}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.4,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              상담을 다시 여는
              <br />
              <span className={styles.heroTitleAccent}>
                단 하나의 기록 화면
              </span>
            </motion.h1>

            <motion.p
              className={styles.heroDescription}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
            >
              녹음 하나를 고품질 원문 텍스트, 구조화 요약, 다음 액션으로
              정리합니다.
              <br />
              왼쪽에서 고르고, 가운데서 읽고, 오른쪽 AI로 바로 정리하세요.
            </motion.p>

            <motion.div
              className={styles.heroCta}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.0 }}
            >
              <button
                className={styles.btnPrimary}
                type="button"
                onClick={openLoginModal}
                aria-haspopup="dialog"
                aria-controls="landing-login-modal"
              >
                상담 기록 시작하기
                <ArrowRight size={18} strokeWidth={2.5} />
              </button>
              <button
                className={styles.btnGhost}
                type="button"
                onClick={() => scrollToSection("features")}
              >
                핵심 기능 보기
              </button>
            </motion.div>
          </motion.div>

          <motion.button
            className={styles.scrollIndicator}
            type="button"
            onClick={() => scrollToSection("stats")}
            aria-label="아래로 스크롤"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
          >
            <ChevronDown size={24} />
          </motion.button>
        </section>

        {/* ── Stats ── */}
        <RevealSection className={styles.statsSection}>
          <div id="stats" className={styles.statsInner}>
            {STATS.map((stat) => (
              <motion.div
                key={stat.label}
                className={styles.statCard}
                variants={fadeUp}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <Counter end={stat.value} suffix={stat.suffix} />
                <span className={styles.statLabel}>{stat.label}</span>
                <div className={styles.statBar}>
                  <motion.div
                    className={styles.statBarFill}
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </RevealSection>

        {/* ── Mission ── */}
        <RevealSection className={styles.missionSection}>
          <div className={styles.missionInner}>
            <motion.p
              className={styles.sectionEyebrow}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
            >
              왜 지금 필요한가
            </motion.p>
            <motion.h2
              className={styles.missionTitle}
              variants={fadeUp}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              녹음이 기록이 되고
              <br />
              기록이 다음 상담이 됩니다
            </motion.h2>
            <motion.p
              className={styles.missionDescription}
              variants={fadeUp}
              transition={{ duration: 0.6 }}
            >
              상담 메모를 다시 정리하느라 시간을 쓰지 않습니다.
              <br />
              원문, 요약, 액션을 한 화면에 남겨 다음 상담 맥락을 바로
              이어갑니다.
            </motion.p>
          </div>
        </RevealSection>

        {/* ── Features ── */}
        <RevealSection className={styles.featuresSection}>
          <div id="features" className={styles.featuresInner}>
            <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
              <p className={styles.sectionEyebrow}>핵심 기능</p>
              <h2 className={styles.featuresTitle}>
                원문, 요약, 액션을
                <br />한 화면에서
              </h2>
            </motion.div>

            <motion.div
              className={styles.featuresGrid}
              variants={staggerContainer}
            >
              {FEATURES.map((feat) => (
                <motion.div
                  key={feat.title}
                  className={styles.featureCard}
                  data-accent={feat.accent}
                  variants={fadeUp}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{
                    y: -8,
                    transition: { duration: 0.25 },
                  }}
                >
                  <div className={styles.featureIconWrap}>
                    <feat.icon size={24} strokeWidth={2} />
                  </div>
                  <h3 className={styles.featureCardTitle}>{feat.title}</h3>
                  <p className={styles.featureCardDesc}>{feat.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </RevealSection>

        {/* ── Philosophy (full-bleed quote) ── */}
        <RevealSection className={styles.philosophySection}>
          <div className={styles.philosophyGlow} />
          <div className={styles.philosophyContent}>
            <motion.p
              className={styles.sectionEyebrow}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
            >
              원칙
            </motion.p>
            <motion.blockquote
              className={styles.philosophyQuote}
              variants={fadeUp}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              &ldquo;원문이 보이지 않으면
              <br />
              AI를 믿을 수 없습니다&rdquo;
            </motion.blockquote>
            <motion.p
              className={styles.philosophyCaption}
              variants={fadeUp}
              transition={{ duration: 0.6 }}
            >
              YEON은 요약보다 먼저 원문을 보여줍니다.
              <br />
              상담 기록이 다음 대화와 후속 관리로 이어지게 설계합니다.
            </motion.p>
          </div>
        </RevealSection>

        {/* ── Flow Steps ── */}
        <RevealSection className={styles.flowSection}>
          <div id="flow" className={styles.flowInner}>
            <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
              <p className={styles.sectionEyebrow}>사용 흐름</p>
              <h2 className={styles.flowTitle}>시작부터 저장까지 단순하게</h2>
            </motion.div>

            <div className={styles.flowTimeline}>
              {FLOW_STEPS.map((step, i) => (
                <motion.div
                  key={step.number}
                  className={styles.flowStep}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.12,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <span className={styles.flowNumber}>{step.number}</span>
                  <div className={styles.flowStepBody}>
                    <h3 className={styles.flowStepTitle}>{step.title}</h3>
                    <p className={styles.flowStepDesc}>{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* ── CTA ── */}
        <RevealSection className={styles.ctaSection}>
          <div className={styles.ctaGlow} />
          <div className={styles.ctaInner}>
            <motion.h2
              className={styles.ctaTitle}
              variants={fadeUp}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              상담 기록을
              <br />
              <span className={styles.ctaTitleAccent}>YEON</span>으로 정리하세요
            </motion.h2>
            <motion.p
              className={styles.ctaDescription}
              variants={fadeUp}
              transition={{ duration: 0.6 }}
            >
              녹음, 원문, 요약, AI 질의를 하나의 흐름으로 연결합니다.
            </motion.p>
            <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
              <button
                className={styles.btnPrimary}
                type="button"
                onClick={openLoginModal}
                aria-haspopup="dialog"
                aria-controls="landing-login-modal"
              >
                워크스페이스 열기
                <ArrowRight size={18} strokeWidth={2.5} />
              </button>
            </motion.div>
          </div>
        </RevealSection>

        {/* ── Footer ── */}
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <span className={styles.footerBrand}>YEON</span>
            <span className={styles.footerCopy}>
              &copy; 2026 YEON. All rights reserved.
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
