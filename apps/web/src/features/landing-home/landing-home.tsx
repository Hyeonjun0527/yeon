"use client";

import { useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  Mic,
  FileText,
  MessageSquare,
  FolderOpen,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { SplineHero } from "./spline-hero";
import { Counter } from "./counter";
import { LoginModal } from "./login-modal";
import styles from "./landing-home.module.css";

/* ── CSS variable definitions for dark landing theme ── */
const LANDING_VARS = {
  "--accent": "#e8630a",
  "--accent-hover": "#d45a08",
  "--accent-glow": "rgba(232,99,10,0.4)",
  "--accent-soft": "rgba(232,99,10,0.12)",
  "--dark-bg": "#050505",
  "--dark-surface": "#0c0c0c",
  "--dark-elevated": "#151515",
  "--dark-border": "rgba(255,255,255,0.06)",
  "--dark-border-hover": "rgba(255,255,255,0.12)",
  "--text-primary": "#f5f5f5",
  "--text-secondary": "rgba(255,255,255,0.65)",
  "--text-muted": "rgba(255,255,255,0.38)",
} as React.CSSProperties;

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
      "핵심 상담 내용, 수강생 이슈 포인트, 다음 액션을 실무형 구조로 나눠 정리합니다.",
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
    title: "수강생별 상담 히스토리",
    description:
      "상담 기록이 수강생 단위로 쌓여 이전 약속, 후속 액션, 멘토링 맥락을 이어서 볼 수 있습니다.",
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
      {/* Landing shell — CSS vars defined here, dot-grid ::before in CSS module */}
      <div
        className={`${styles.landing} bg-[var(--dark-bg)] text-[var(--text-primary)] overflow-x-hidden`}
        style={LANDING_VARS}
      >
        {/* ── Hero ── */}
        <section
          ref={heroRef}
          className="relative min-h-screen flex items-end justify-start overflow-hidden"
        >
          <motion.div
            style={{ y: heroY }}
            className="absolute inset-0 z-0"
          >
            <SplineHero />
          </motion.div>

          <div className={styles.heroGradient} />

          <motion.div
            className="relative z-[3] max-w-[820px] px-12 pb-[100px] grid gap-6 md:px-6 md:pb-20"
            style={{ opacity: heroOpacity }}
          >
            <motion.p
              className="m-0 text-[13px] font-semibold tracking-[0.2em] uppercase text-[var(--accent)] font-mono"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              YEON
            </motion.p>

            <motion.h1
              className="m-0 text-[clamp(44px,7.5vw,84px)] font-black leading-[1.02] tracking-[-0.045em] text-[var(--text-primary)]"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.4,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              좋은 상담은
              <br />
              기억에만
              <br />
              <span className="text-[var(--accent)] relative">남기기 아깝습니다</span>
            </motion.h1>

            <motion.p
              className="m-0 text-[clamp(16px,2vw,20px)] leading-[1.75] text-[var(--text-secondary)] max-w-[520px]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
            >
              켜두기만 하세요. 상담이 끝나면 기록이 완성되어 있습니다.
              <br />
              녹음 버튼 하나면 전사부터 요약, 후속 조치까지 자동으로 정리됩니다.
            </motion.p>

            <motion.div
              className="flex gap-4 flex-wrap pt-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.0 }}
            >
              <button
                className={`${styles.btnPrimary} inline-flex items-center gap-2.5 px-9 py-4 bg-[var(--accent)] text-white font-bold text-base border-0 rounded-[14px] cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] relative overflow-hidden hover:bg-[var(--accent-hover)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_var(--accent-glow),0_0_0_1px_rgba(232,99,10,0.2)]`}
                type="button"
                onClick={openLoginModal}
                aria-haspopup="dialog"
                aria-controls="landing-login-modal"
              >
                상담 기록 시작하기
                <ArrowRight size={18} strokeWidth={2.5} />
              </button>
              <button
                className="inline-flex items-center gap-2.5 px-9 py-4 bg-[rgba(255,255,255,0.03)] backdrop-blur-sm text-[var(--text-secondary)] font-semibold text-base border border-[var(--dark-border)] rounded-[14px] cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--dark-border-hover)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.06)] hover:-translate-y-0.5"
                type="button"
                onClick={() => scrollToSection("features")}
              >
                핵심 기능 보기
              </button>
            </motion.div>
          </motion.div>

          <motion.button
            className={`${styles.scrollIndicator} absolute bottom-8 left-1/2 -translate-x-1/2 z-[4] bg-[rgba(255,255,255,0.04)] backdrop-blur-sm border border-[var(--dark-border)] rounded-full w-13 h-13 flex items-center justify-center text-[var(--text-muted)] cursor-pointer transition-all duration-300 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[rgba(232,99,10,0.08)]`}
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
        <RevealSection className="relative z-[1] py-24 px-12 bg-[var(--dark-surface)] border-t border-[var(--dark-border)] border-b md:px-6">
          <div id="stats" className="max-w-[1100px] mx-auto grid grid-cols-3 gap-12 md:grid-cols-1">
            {STATS.map((stat) => (
              <motion.div
                key={stat.label}
                className="text-center flex flex-col gap-2 items-center"
                variants={fadeUp}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <Counter end={stat.value} suffix={stat.suffix} />
                <span className="text-[14px] font-medium text-[var(--text-muted)] tracking-[0.04em] uppercase">
                  {stat.label}
                </span>
                <div className="w-16 h-[3px] bg-[var(--dark-border)] rounded-sm mt-2 overflow-hidden">
                  <motion.div
                    className="w-full h-full bg-[var(--accent)] rounded-sm origin-left"
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
        <RevealSection className="relative z-[1] py-40 px-12 flex justify-center text-center bg-[var(--dark-bg)] md:px-6 md:py-[100px]">
          <div className="max-w-[720px] grid gap-7">
            <motion.p
              className="m-0 text-[12px] font-bold tracking-[0.2em] uppercase text-[var(--accent)] font-mono"
              variants={fadeUp}
              transition={{ duration: 0.5 }}
            >
              왜 지금 필요한가
            </motion.p>
            <motion.h2
              className="m-0 text-[clamp(34px,5.5vw,60px)] font-black leading-[1.1] tracking-[-0.035em]"
              variants={fadeUp}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              녹음이 기록이 되고
              <br />
              기록이 다음 상담이 됩니다
            </motion.h2>
            <motion.p
              className="m-0 text-[18px] leading-[1.85] text-[var(--text-secondary)]"
              variants={fadeUp}
              transition={{ duration: 0.6 }}
            >
              상담 메모를 다시 정리하느라 시간을 쓰지 않습니다.
              <br />
              원문, 요약, 액션을 한 화면에 남겨 다음 상담 맥락을 바로 이어갑니다.
            </motion.p>
          </div>
        </RevealSection>

        {/* ── Features ── */}
        <RevealSection className="relative z-[1] py-[120px] px-12 pb-[140px] bg-[var(--dark-surface)] md:px-6">
          <div id="features" className="max-w-[1100px] mx-auto grid gap-[72px]">
            <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
              <p className="m-0 text-[12px] font-bold tracking-[0.2em] uppercase text-[var(--accent)] font-mono">핵심 기능</p>
              <h2 className="m-0 text-[clamp(28px,4vw,48px)] font-black leading-[1.15] tracking-[-0.025em]">
                원문, 요약, 액션을
                <br />한 화면에서
              </h2>
            </motion.div>

            <motion.div
              className="grid grid-cols-2 gap-5 md:grid-cols-1"
              variants={staggerContainer}
            >
              {FEATURES.map((feat) => (
                <motion.div
                  key={feat.title}
                  className={`${styles.featureCard} p-10 bg-[var(--dark-elevated)] border border-[var(--dark-border)] rounded-3xl grid gap-4 cursor-default transition-[border-color,box-shadow] duration-[350ms] ease-in-out hover:border-[var(--dark-border-hover)] hover:shadow-[0_24px_56px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)] md:p-8`}
                  data-accent={feat.accent}
                  variants={fadeUp}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{
                    y: -8,
                    transition: { duration: 0.25 },
                  }}
                >
                  <div className={`${styles.featureIconWrap} w-14 h-14 flex items-center justify-center rounded-2xl`}>
                    <feat.icon size={24} strokeWidth={2} />
                  </div>
                  <h3 className="m-0 text-[21px] font-bold">{feat.title}</h3>
                  <p className="m-0 text-[15px] leading-[1.75] text-[var(--text-secondary)]">{feat.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </RevealSection>

        {/* ── Philosophy (full-bleed quote) ── */}
        <RevealSection className="relative z-[1] py-[180px] px-12 flex items-center justify-center text-center bg-[var(--dark-bg)] overflow-hidden md:px-6 md:py-[100px]">
          <div className={styles.philosophyGlow} />
          <div className="relative max-w-[800px] grid gap-9">
            <motion.p
              className="m-0 text-[12px] font-bold tracking-[0.2em] uppercase text-[var(--accent)] font-mono"
              variants={fadeUp}
              transition={{ duration: 0.5 }}
            >
              원칙
            </motion.p>
            <motion.blockquote
              className="m-0 text-[clamp(30px,5.5vw,56px)] font-black leading-[1.2] tracking-[-0.035em] text-[var(--text-primary)]"
              variants={fadeUp}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              &ldquo;원문이 보이지 않으면
              <br />
              AI를 믿을 수 없습니다&rdquo;
            </motion.blockquote>
            <motion.p
              className="m-0 text-[17px] leading-[1.85] text-[var(--text-muted)]"
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
        <RevealSection className="relative z-[1] py-[120px] px-12 pb-[140px] bg-[var(--dark-surface)] md:px-6">
          <div id="flow" className="max-w-[800px] mx-auto grid gap-[72px]">
            <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
              <p className="m-0 text-[12px] font-bold tracking-[0.2em] uppercase text-[var(--accent)] font-mono">사용 흐름</p>
              <h2 className="m-0 text-[clamp(28px,4vw,48px)] font-black leading-[1.15] tracking-[-0.025em]">시작부터 저장까지 단순하게</h2>
            </motion.div>

            <div className="grid gap-0">
              {FLOW_STEPS.map((step, i) => (
                <motion.div
                  key={step.number}
                  className="flex gap-7 py-9 border-b border-[var(--dark-border)] items-start first:border-t first:border-[var(--dark-border)] md:gap-5 md:py-7"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.12,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <span className="text-[44px] font-black text-[var(--accent)] tracking-[-0.04em] leading-none shrink-0 w-[68px] tabular-nums font-mono md:text-[36px] md:w-[52px]">
                    {step.number}
                  </span>
                  <div className="grid gap-1.5 pt-2">
                    <h3 className="m-0 text-[21px] font-bold">{step.title}</h3>
                    <p className="m-0 text-[15px] text-[var(--text-secondary)] leading-[1.65]">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* ── CTA ── */}
        <RevealSection className="relative z-[1] py-40 px-12 flex justify-center text-center bg-[var(--dark-bg)] overflow-hidden md:px-6 md:py-[100px]">
          <div className={styles.ctaGlow} />
          <div className="relative max-w-[600px] grid gap-7 justify-items-center">
            <motion.h2
              className="m-0 text-[clamp(34px,5.5vw,60px)] font-black leading-[1.1] tracking-[-0.035em]"
              variants={fadeUp}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              상담 기록을
              <br />
              <span className="text-[var(--accent)]">YEON</span>으로 정리하세요
            </motion.h2>
            <motion.p
              className="m-0 text-[18px] text-[var(--text-secondary)] leading-[1.75]"
              variants={fadeUp}
              transition={{ duration: 0.6 }}
            >
              녹음, 원문, 요약, AI 질의를 하나의 흐름으로 연결합니다.
            </motion.p>
            <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
              <button
                className={`${styles.btnPrimary} inline-flex items-center gap-2.5 px-9 py-4 bg-[var(--accent)] text-white font-bold text-base border-0 rounded-[14px] cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] relative overflow-hidden hover:bg-[var(--accent-hover)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_var(--accent-glow),0_0_0_1px_rgba(232,99,10,0.2)]`}
                type="button"
                onClick={openLoginModal}
                aria-haspopup="dialog"
                aria-controls="landing-login-modal"
              >
                시작하기
                <ArrowRight size={18} strokeWidth={2.5} />
              </button>
            </motion.div>
          </div>
        </RevealSection>

        {/* ── Footer ── */}
        <footer className="relative z-[1] py-9 px-12 bg-[var(--dark-bg)] border-t border-[var(--dark-border)] md:p-6">
          <div className="max-w-[1100px] mx-auto flex justify-between items-center md:flex-col md:gap-3 md:text-center">
            <span className="text-[22px] font-black tracking-[-0.03em]">YEON</span>
            <span className="text-[13px] text-[var(--text-muted)]">
              &copy; 2026 YEON. All rights reserved.
            </span>
            <div className="flex gap-4">
              <a
                href="/privacy"
                className="text-[13px] text-[var(--text-muted)] no-underline transition-colors duration-150 hover:text-[var(--text-primary)]"
              >
                개인정보처리방침
              </a>
              <a
                href="/terms"
                className="text-[13px] text-[var(--text-muted)] no-underline transition-colors duration-150 hover:text-[var(--text-primary)]"
              >
                서비스 이용약관
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
