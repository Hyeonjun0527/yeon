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
  Users,
  BarChart3,
  ClipboardCheck,
  Zap,
  ArrowRight,
  ChevronDown,
  X,
} from "lucide-react";
import { SplineHero } from "./spline-hero";
import { Counter } from "./counter";
import styles from "./landing-home.module.css";

/* ── Data ── */

const STATS = [
  { label: "관리 가능 학생 수", value: 500, suffix: "+" },
  { label: "일일 개입 판단 시간", value: 30, suffix: "분" },
  { label: "상태 자동 분류 정확도", value: 98, suffix: "%" },
] as const;

const FEATURES = [
  {
    icon: Users,
    title: "우선순위 학생 큐",
    description:
      "AI가 출결, 과제, 참여도를 종합해 오늘 먼저 챙겨야 할 학생을 자동으로 줄 세웁니다.",
    accent: "orange" as const,
  },
  {
    icon: BarChart3,
    title: "실시간 대시보드",
    description:
      "학생별 진행률, 위험 신호, 최근 활동을 한 화면에서 파악합니다. 엑셀을 열 필요가 없습니다.",
    accent: "blue" as const,
  },
  {
    icon: ClipboardCheck,
    title: "개입 기록 추적",
    description:
      "누가, 언제, 어떤 개입을 했는지 자동 기록합니다. 같은 학생에게 두 번 물어볼 일이 없습니다.",
    accent: "green" as const,
  },
  {
    icon: Zap,
    title: "30분 루틴",
    description:
      "수업 전 30분, 대시보드 확인부터 개입 완료까지. 복잡한 도구 대신 하나의 흐름으로 끝냅니다.",
    accent: "purple" as const,
  },
] as const;

const FLOW_STEPS = [
  { number: "01", title: "로그인", description: "운영자 인증을 통과합니다." },
  {
    number: "02",
    title: "프로젝트 생성",
    description: "운영 대상과 기본 메타데이터를 고정합니다.",
  },
  {
    number: "03",
    title: "학생 데이터 연결",
    description: "파일 업로드로 학생 정보를 한 번에 채웁니다.",
  },
  {
    number: "04",
    title: "운영 시작",
    description: "AI가 분석한 우선순위에 따라 개입합니다.",
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

function LoginModal({ open, onClose }: LoginModalProps) {
  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
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
                  3초 만에 시작할 수 있어요.
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
                  disabled
                >
                  <KakaoTalkIcon />
                  카카오 로그인
                </button>

                <button
                  type="button"
                  className={`${styles.loginButton} ${styles.googleButton}`}
                  disabled
                >
                  <GoogleIcon />
                  구글 로그인
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

export function LandingHome() {
  const heroRef = useRef(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
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

  return (
    <>
      <LoginModal open={isLoginModalOpen} onClose={closeLoginModal} />
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
              YEON
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
              학생을 놓치지 않는
              <br />
              <span className={styles.heroTitleAccent}>단 하나의 화면</span>
            </motion.h1>

            <motion.p
              className={styles.heroDescription}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
            >
              수업 전 30분, 오늘 챙겨야 할 학생을 AI가 정리해줍니다.
              <br />
              교강사는 판단과 개입에만 집중하세요.
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
                시작하기
                <ArrowRight size={18} strokeWidth={2.5} />
              </button>
              <button className={styles.btnGhost} type="button">
                더 알아보기
              </button>
            </motion.div>
          </motion.div>

          <motion.button
            className={styles.scrollIndicator}
            type="button"
            onClick={() =>
              document
                .getElementById("stats")
                ?.scrollIntoView({ behavior: "smooth" })
            }
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
              Mission
            </motion.p>
            <motion.h2
              className={styles.missionTitle}
              variants={fadeUp}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              교강사의 시간을
              <br />
              학생에게 돌려줍니다
            </motion.h2>
            <motion.p
              className={styles.missionDescription}
              variants={fadeUp}
              transition={{ duration: 0.6 }}
            >
              출결 집계, 과제 취합, 엑셀 정리에 쓰던 시간을 AI가 대신합니다.
              <br />
              교강사는 학생을 직접 만나고, 대화하고, 개입하는 데 집중하세요.
            </motion.p>
          </div>
        </RevealSection>

        {/* ── Features ── */}
        <RevealSection className={styles.featuresSection}>
          <div className={styles.featuresInner}>
            <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
              <p className={styles.sectionEyebrow}>Core Features</p>
              <h2 className={styles.featuresTitle}>
                운영에 필요한 모든 것,
                <br />한 곳에서
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
              Philosophy
            </motion.p>
            <motion.blockquote
              className={styles.philosophyQuote}
              variants={fadeUp}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              &ldquo;도구가 복잡해지면
              <br />
              학생이 보이지 않습니다&rdquo;
            </motion.blockquote>
            <motion.p
              className={styles.philosophyCaption}
              variants={fadeUp}
              transition={{ duration: 0.6 }}
            >
              YEON은 교강사가 매일 반복하는 판단을 단순하게 만듭니다.
              <br />
              기술이 아니라, 학생과의 접점을 설계합니다.
            </motion.p>
          </div>
        </RevealSection>

        {/* ── Flow Steps ── */}
        <RevealSection className={styles.flowSection}>
          <div className={styles.flowInner}>
            <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
              <p className={styles.sectionEyebrow}>How It Works</p>
              <h2 className={styles.flowTitle}>시작은 간단합니다</h2>
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
              지금 바로
              <br />
              <span className={styles.ctaTitleAccent}>YEON</span>을 시작하세요
            </motion.h2>
            <motion.p
              className={styles.ctaDescription}
              variants={fadeUp}
              transition={{ duration: 0.6 }}
            >
              복잡한 설정 없이, 로그인 한 번이면 준비 완료.
            </motion.p>
            <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
              <button
                className={styles.btnPrimary}
                type="button"
                onClick={openLoginModal}
                aria-haspopup="dialog"
                aria-controls="landing-login-modal"
              >
                무료로 시작하기
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
