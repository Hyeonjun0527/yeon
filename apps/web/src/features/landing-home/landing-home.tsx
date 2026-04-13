"use client";

import { memo, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { DevLoginOption } from "@/lib/auth/dev-login-options";
import { SplineHero } from "./spline-hero";
import { Counter } from "./counter";
import { FEATURES, FLOW_STEPS, STATS } from "./landing-constants";
import { LoginModal } from "./login-modal";
import styles from "./landing-home.module.css";

/* ── CSS variable definitions for dark landing theme ── */
const LANDING_VARS = {
  "--accent": "#818cf8",
  "--accent-hover": "#6366f1",
  "--accent-glow": "rgba(129,140,248,0.34)",
  "--accent-soft": "rgba(129,140,248,0.14)",
  "--dark-bg": "#050505",
  "--dark-surface": "#0c0c0c",
  "--dark-elevated": "#151515",
  "--dark-border": "rgba(255,255,255,0.06)",
  "--dark-border-hover": "rgba(255,255,255,0.12)",
  "--text-primary": "#f5f5f5",
  "--text-secondary": "rgba(255,255,255,0.65)",
  "--text-muted": "rgba(255,255,255,0.38)",
} as React.CSSProperties;

const HeroSection = memo(function HeroSection({
  paused,
  onOpenLogin,
  onScrollToStats,
}: {
  paused: boolean;
  onOpenLogin: () => void;
  onScrollToStats: () => void;
}) {
  return (
    <section className="relative flex min-h-[560px] items-start justify-start overflow-hidden md:min-h-screen md:items-end">
      <div className="absolute inset-0 z-0">
        <SplineHero paused={paused} />
      </div>

      <div className={styles.heroGradient} />
      <div className={styles.heroMobileScrim} />

      <div
        className={`${styles.heroCopyShell} relative z-[3] mt-12 grid w-full max-w-[820px] gap-4 px-5 pb-8 pt-6 md:mt-0 md:gap-5 md:bg-transparent md:px-12 md:pb-[100px] md:pt-0`}
      >
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)] font-mono md:text-[13px] md:tracking-[0.2em]">
          YEON
        </p>

        <p className="m-0 inline-flex w-fit items-center rounded-full border border-[rgba(129,140,248,0.22)] bg-[rgba(129,140,248,0.08)] px-3 py-1 text-[11px] font-semibold tracking-[-0.01em] text-[rgba(255,255,255,0.82)] md:px-3.5 md:py-1.5 md:text-[12px]">
          교육기관 운영자와 멘토를 위한 상담 기록 워크스페이스
        </p>

        <h1 className="m-0 max-w-[320px] text-[clamp(31px,9.5vw,84px)] font-black leading-[1.02] tracking-[-0.05em] text-[var(--text-primary)] md:max-w-none md:text-[clamp(44px,7.5vw,84px)] md:leading-[1.02] md:tracking-[-0.045em]">
          <span className="md:hidden">
            <span className="block">상담기록부터</span>
            <span className="block">수강생 관리 보고까지</span>
            <span className="relative block text-[var(--accent)]">한 번에</span>
          </span>
          <span className="hidden md:inline">
            상담기록부터
            <br />
            수강생 관리 보고까지
            <br />
            <span className="text-[var(--accent)] relative">한 번에</span>
          </span>
        </h1>

        <p className="m-0 max-w-[318px] text-[15px] leading-[1.68] text-[rgba(255,255,255,0.86)] md:max-w-[520px] md:text-[clamp(16px,2vw,20px)] md:leading-[1.75] md:text-[var(--text-secondary)]">
          <span className="md:hidden">
            <span className="block">녹음하면 원문이 남고,</span>
            <span className="block">AI가 수강생 정보를 정리하고,</span>
            <span className="block">보고서까지 바로 이어집니다</span>
          </span>
          <span className="hidden md:inline">
            녹음하면 원문이 남고, AI가 핵심을 정리하고,
            <br className="hidden md:block" />
            수강생 정보 추출과 엑셀·워드 보고서까지 바로 이어집니다.
          </span>
        </p>

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap md:pt-2">
          <button
            className="pointer-events-auto relative z-[6] inline-flex min-h-[58px] w-full items-center justify-center gap-2.5 rounded-[20px] border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.16)] px-6 py-4 text-base font-bold text-white shadow-[0_16px_34px_rgba(0,0,0,0.18)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:border-[rgba(255,255,255,0.28)] hover:bg-[rgba(255,255,255,0.22)] hover:shadow-[0_22px_42px_rgba(0,0,0,0.24)] sm:w-auto sm:px-9 md:rounded-[14px]"
            type="button"
            onClick={onOpenLogin}
            aria-haspopup="dialog"
            aria-controls="landing-login-modal"
          >
            로그인하고 시작하기
          </button>
        </div>
      </div>

      <motion.button
        className={`${styles.scrollIndicator} absolute bottom-8 left-1/2 z-[4] hidden h-13 w-13 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--dark-border)] bg-[rgba(255,255,255,0.04)] text-[var(--text-muted)] transition-all duration-300 hover:border-[var(--accent)] hover:bg-[rgba(129,140,248,0.1)] hover:text-[var(--accent)] md:flex`}
        type="button"
        onClick={onScrollToStats}
        aria-label="아래로 스크롤"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
      >
        <ChevronDown size={24} />
      </motion.button>
    </section>
  );
});

const StatsSection = memo(function StatsSection() {
  return (
    <section className="relative z-[1] border-b border-t border-[var(--dark-border)] bg-[var(--dark-surface)] px-5 py-10 md:px-12 md:py-24">
      <div
        id="stats"
        className="mx-auto grid max-w-[1100px] grid-cols-1 gap-3 md:grid-cols-3 md:gap-12"
      >
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="grid gap-3 rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-5 py-5 text-left shadow-[0_14px_32px_rgba(0,0,0,0.12)] md:flex md:flex-col md:items-center md:gap-2 md:border-0 md:bg-transparent md:px-0 md:py-0 md:text-center md:shadow-none"
          >
            <Counter
              end={stat.value}
              suffix={stat.suffix}
              className="text-[clamp(42px,13vw,68px)]"
            />
            <div className="grid gap-3 md:flex-none md:items-center">
              <span className="text-[17px] font-semibold leading-[1.3] text-[var(--text-primary)] md:text-[14px] md:font-medium md:tracking-[0.04em] md:text-[var(--text-secondary)] md:uppercase">
                {stat.label}
              </span>
              <p className="m-0 max-w-[28ch] text-[13px] leading-[1.65] text-[rgba(255,255,255,0.62)] md:max-w-none md:hidden">
                {stat.description}
              </p>
              <div className="h-[3px] w-20 overflow-hidden rounded-sm bg-[rgba(255,255,255,0.08)] md:mt-2 md:w-16 md:bg-[var(--dark-border)]">
                <motion.div
                  className="h-full w-full origin-left rounded-sm bg-[var(--accent)]"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 1.2,
                    delay: 0.3,
                    ease: "easeOut",
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});

const MissionSection = memo(function MissionSection() {
  return (
    <section className="relative z-[1] hidden justify-center bg-[var(--dark-bg)] px-5 py-14 text-left md:flex md:px-12 md:py-40 md:text-center">
      <div className="grid max-w-[720px] gap-5 md:gap-7">
        <p className="m-0 text-[12px] font-bold tracking-[0.2em] uppercase text-[var(--accent)] font-mono">
          왜 지금 필요한가
        </p>
        <h2 className="m-0 max-w-[12ch] text-[clamp(30px,10vw,60px)] font-black leading-[1.08] tracking-[-0.045em] md:max-w-none md:text-[clamp(34px,5.5vw,60px)] md:tracking-[-0.035em]">
          녹음이 기록이 되고
          <br />
          기록이 다음 상담이 됩니다
        </h2>
        <p className="m-0 max-w-[34ch] text-[15px] leading-[1.78] text-[rgba(255,255,255,0.74)] md:max-w-none md:text-[18px] md:leading-[1.85] md:text-[var(--text-secondary)]">
          상담 메모를 다시 정리하느라 시간을 쓰지 않습니다.
          <br />
          원문, 요약, 액션을 한 화면에 남겨 다음 상담 맥락을 바로 이어갑니다.
        </p>
      </div>
    </section>
  );
});

const FeaturesSection = memo(function FeaturesSection() {
  return (
    <section className="relative z-[1] bg-[var(--dark-surface)] px-5 py-14 pb-16 md:px-12 md:py-[120px] md:pb-[140px]">
      <div
        id="features"
        className="mx-auto grid max-w-[1100px] gap-8 md:gap-[72px]"
      >
        <div>
          <p className="m-0 text-[12px] font-bold tracking-[0.2em] uppercase text-[var(--accent)] font-mono">
            핵심 기능
          </p>
          <h2 className="m-0 max-w-[11ch] text-[clamp(28px,9vw,48px)] font-black leading-[1.08] tracking-[-0.04em] md:max-w-none md:text-[clamp(28px,4vw,48px)] md:leading-[1.15] md:tracking-[-0.025em]">
            상담기록이 관리와 보고로
            <br />
            바로 이어집니다
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {FEATURES.map((feat) => (
            <div
              key={feat.title}
              className={`${styles.featureCard} grid gap-4 rounded-[28px] border border-[var(--dark-border)] bg-[var(--dark-elevated)] p-5 transition-[border-color,box-shadow] duration-[350ms] ease-in-out hover:border-[var(--dark-border-hover)] hover:shadow-[0_24px_56px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)] md:gap-4 md:rounded-3xl md:p-8`}
              data-accent={feat.accent}
            >
              <div
                className={`${styles.featureIconWrap} flex h-14 w-14 items-center justify-center rounded-2xl`}
              >
                <feat.icon size={24} strokeWidth={2} />
              </div>
              <h3 className="m-0 max-w-none text-[22px] font-bold leading-[1.15] tracking-[-0.035em] md:text-[21px] md:tracking-normal">
                {feat.title}
              </h3>
              <p className="m-0 text-[15px] leading-[1.68] text-[rgba(255,255,255,0.74)] md:leading-[1.75] md:text-[var(--text-secondary)]">
                {feat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

const PhilosophySection = memo(function PhilosophySection() {
  return (
    <section className="relative z-[1] hidden items-center justify-center overflow-hidden bg-[var(--dark-bg)] px-5 py-14 text-left md:flex md:px-12 md:py-[180px] md:text-center">
      <div className={styles.philosophyGlow} />
      <div className="relative grid max-w-[800px] gap-6 md:gap-9">
        <p className="m-0 text-[12px] font-bold tracking-[0.2em] uppercase text-[var(--accent)] font-mono">
          원칙
        </p>
        <blockquote className="m-0 max-w-[11ch] text-[clamp(28px,10vw,56px)] font-black leading-[1.12] tracking-[-0.05em] text-[var(--text-primary)] md:max-w-none md:text-[clamp(30px,5.5vw,56px)] md:leading-[1.2] md:tracking-[-0.035em]">
          &ldquo;원문이 보이지 않으면
          <br />
          AI를 믿을 수 없습니다&rdquo;
        </blockquote>
        <p className="m-0 max-w-[34ch] text-[15px] leading-[1.78] text-[rgba(255,255,255,0.68)] md:max-w-none md:text-[17px] md:leading-[1.85] md:text-[var(--text-muted)]">
          YEON은 요약보다 먼저 원문을 보여줍니다.
          <br />
          상담 기록이 다음 대화와 후속 관리로 이어지게 설계합니다.
        </p>
      </div>
    </section>
  );
});

const FlowSection = memo(function FlowSection() {
  return (
    <section className="relative z-[1] hidden bg-[var(--dark-surface)] px-5 py-14 pb-16 md:block md:px-12 md:py-[120px] md:pb-[140px]">
      <div id="flow" className="mx-auto grid max-w-[800px] gap-8 md:gap-[72px]">
        <div>
          <p className="m-0 text-[12px] font-bold tracking-[0.2em] uppercase text-[var(--accent)] font-mono">
            사용 흐름
          </p>
          <h2 className="m-0 max-w-[12ch] text-[clamp(28px,9vw,48px)] font-black leading-[1.08] tracking-[-0.045em] md:max-w-none md:text-[clamp(28px,4vw,48px)] md:leading-[1.15] md:tracking-[-0.025em]">
            시작부터 저장까지 단순하게
          </h2>
        </div>

        <div className="grid gap-0">
          {FLOW_STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              className="flex items-start gap-4 border-b border-[var(--dark-border)] py-6 first:border-t first:border-[var(--dark-border)] md:gap-5 md:py-7"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                duration: 0.6,
                delay: i * 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <span className="w-[44px] shrink-0 font-mono text-[30px] font-black leading-none tracking-[-0.04em] text-[var(--accent)] tabular-nums md:w-[52px] md:text-[36px]">
                {step.number}
              </span>
              <div className="grid gap-1.5 pt-1 md:pt-2">
                <h3 className="m-0 text-[18px] font-bold leading-[1.25] md:text-[21px]">
                  {step.title}
                </h3>
                <p className="m-0 text-[14px] leading-[1.65] text-[rgba(255,255,255,0.74)] md:text-[15px] md:text-[var(--text-secondary)]">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});

const CtaSection = memo(function CtaSection({
  onOpenLogin,
}: {
  onOpenLogin: () => void;
}) {
  return (
    <section className="relative z-[1] flex justify-center overflow-hidden bg-[var(--dark-bg)] px-5 py-14 text-left md:px-12 md:py-40 md:text-center">
      <div className={styles.ctaGlow} />
      <div className="relative grid max-w-[600px] gap-5 justify-items-start rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-5 py-6 shadow-[0_18px_48px_rgba(0,0,0,0.18)] md:justify-items-center md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none md:gap-7">
        <div>
          <h2 className="m-0 max-w-[11ch] text-[clamp(30px,10vw,60px)] font-black leading-[1.05] tracking-[-0.05em] md:max-w-none md:text-[clamp(34px,5.5vw,60px)] md:leading-[1.1] md:tracking-[-0.035em]">
            상담 기록을
            <br />
            <span className="text-[var(--accent)]">YEON</span>으로 정리하세요
          </h2>
          <p className="m-0 max-w-[32ch] text-[15px] leading-[1.72] text-[rgba(255,255,255,0.78)] md:max-w-none md:text-[18px] md:text-[var(--text-secondary)]">
            녹음, 원문, 요약, AI 질의를 하나의 흐름으로 연결합니다.
          </p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap md:w-auto md:items-center md:justify-center md:gap-4">
          <button
            className="inline-flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-[18px] border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.14)] px-6 py-4 text-base font-bold text-white shadow-[0_14px_28px_rgba(0,0,0,0.16)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:border-[rgba(255,255,255,0.26)] hover:bg-[rgba(255,255,255,0.2)] hover:shadow-[0_20px_36px_rgba(0,0,0,0.22)] sm:w-auto sm:px-9 md:rounded-[14px]"
            type="button"
            onClick={onOpenLogin}
            aria-haspopup="dialog"
            aria-controls="landing-login-modal"
          >
            로그인하고 시작하기
          </button>
        </div>
      </div>
    </section>
  );
});

const FooterSection = memo(function FooterSection() {
  return (
    <footer className="relative z-[1] border-t border-[var(--dark-border)] bg-[var(--dark-bg)] px-5 py-8 md:px-12 md:py-9">
      <div className="mx-auto grid max-w-[1100px] gap-6 md:gap-7">
        <div className="grid gap-4 rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-5 py-5 shadow-[0_14px_34px_rgba(0,0,0,0.14)] md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:gap-6 md:px-6">
          <div className="grid gap-2">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
              앱 목적
            </p>
            <p className="m-0 text-[14px] leading-[1.8] text-[rgba(255,255,255,0.82)] md:text-[15px]">
              YEON은 교육기관 운영자와 멘토가 상담 녹음, 전사 원문, 구조화 요약,
              후속 액션을 한 워크스페이스에서 관리하도록 돕는 상담 기록
              서비스입니다.
            </p>
          </div>
          <div className="grid gap-2">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Google 계정 정보 사용 안내
            </p>
            <p className="m-0 text-[13px] leading-[1.75] text-[var(--text-muted)] md:text-[14px]">
              Google 로그인 시 이름, 이메일, 프로필 이미지는 회원 식별과 로그인
              유지에만 사용합니다. 사용자가 직접 Google Drive 연동을 시작한
              경우에만 파일 가져오기를 위해 추가 권한을 요청합니다.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-4 text-left md:flex-row md:items-center md:justify-between md:gap-3 md:text-center">
          <span className="text-[20px] font-black tracking-[-0.03em] md:text-[22px]">
            YEON
          </span>
          <span className="text-[12px] leading-[1.6] text-[var(--text-muted)] md:text-[13px]">
            &copy; 2026 YEON. All rights reserved.
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
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
      </div>
    </footer>
  );
});

/* ── Main Component ── */

type LandingHomeProps = {
  nextPath: string;
  initialLoginModalOpen?: boolean;
  devLoginOptions: DevLoginOption[];
};

export function LandingHome({
  nextPath,
  initialLoginModalOpen = false,
  devLoginOptions,
}: LandingHomeProps) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(
    initialLoginModalOpen,
  );

  const handleLoginModalOpen = useCallback(() => {
    setIsLoginModalOpen(true);
  }, []);

  const handleLoginModalClose = useCallback(() => {
    setIsLoginModalOpen(false);
  }, []);

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleScrollToStats = useCallback(() => {
    scrollToSection("stats");
  }, [scrollToSection]);

  return (
    <>
      <LoginModal
        open={isLoginModalOpen}
        onClose={handleLoginModalClose}
        nextPath={nextPath}
        devLoginOptions={devLoginOptions}
      />
      {/* Landing shell — CSS vars defined here, dot-grid ::before in CSS module */}
      <div
        className={`${styles.landing} bg-[var(--dark-bg)] text-[var(--text-primary)] overflow-x-hidden`}
        style={LANDING_VARS}
      >
        <HeroSection
          paused={isLoginModalOpen}
          onOpenLogin={handleLoginModalOpen}
          onScrollToStats={handleScrollToStats}
        />
        <StatsSection />
        <MissionSection />
        <FeaturesSection />
        <PhilosophySection />
        <FlowSection />
        <CtaSection onOpenLogin={handleLoginModalOpen} />
        <FooterSection />
      </div>
    </>
  );
}
