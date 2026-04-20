"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { DevLoginOption } from "@/lib/auth/dev-login-options";
import type { PlatformServiceDescriptor } from "@/lib/platform-services";
import {
  platformServiceAccessPolicies,
  platformServiceStatuses,
} from "@/lib/platform-services";
import {
  BRAND_REVIEW_CONTACT_DESCRIPTION,
  GOOGLE_ACCOUNT_DATA_USAGE_DESCRIPTION,
  SITE_BRAND_NAME,
  SITE_PURPOSE_DESCRIPTION,
  SITE_SUPPORT_EMAIL,
} from "@/lib/site-brand";
import { SplineHero } from "./spline-hero";
import { Counter } from "./counter";
import { FEATURES, FLOW_STEPS, STATS } from "./landing-constants";
import { LoginModal } from "./login-modal";
import styles from "./landing-workspace.module.css";

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

const ACCESS_POLICY_COPY = {
  [platformServiceAccessPolicies.anonymous]: "로그인 없이 사용 가능",
  [platformServiceAccessPolicies.authRequired]: "로그인 후 진입",
  [platformServiceAccessPolicies.mixed]: "서비스별 공개/로그인 혼합",
} as const;

const HeroSection = memo(function HeroSection({
  paused,
  onPrimaryAction,
  onScrollToStats,
  primaryActionLabel,
}: {
  paused: boolean;
  onPrimaryAction: () => void;
  onScrollToStats: () => void;
  primaryActionLabel: string;
}) {
  const [isSplineLive, setIsSplineLive] = useState(false);

  return (
    <section className="relative flex min-h-[560px] items-start justify-start overflow-hidden md:min-h-screen md:items-end">
      <div className="absolute inset-0 z-0">
        <SplineHero paused={paused} onLiveSceneChange={setIsSplineLive} />
      </div>

      <div
        className={`${styles.heroGradient} ${
          isSplineLive ? styles.heroGradientLive : ""
        }`}
      />
      <div className={styles.heroMobileScrim} />

      <div
        className={`${styles.heroCopyShell} ${
          isSplineLive ? styles.heroCopyShellLive : ""
        } relative z-[3] mt-12 grid w-full max-w-[820px] gap-4 px-5 pb-8 pt-6 md:mt-0 md:gap-5 md:bg-transparent md:px-12 md:pb-[100px] md:pt-0`}
      >
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)] font-mono md:text-[13px] md:tracking-[0.2em]">
          {SITE_BRAND_NAME}
        </p>

        <p className="m-0 inline-flex w-fit items-center rounded-full border border-[rgba(129,140,248,0.22)] bg-[rgba(129,140,248,0.08)] px-3 py-1 text-[11px] font-semibold tracking-[-0.01em] text-[rgba(255,255,255,0.82)] md:px-3.5 md:py-1.5 md:text-[12px]">
          루트 포털에서 여러 서비스를 여는 멀티 서비스 플랫폼
        </p>

        <h1 className="m-0 max-w-[320px] text-[clamp(31px,9.5vw,84px)] font-black leading-[1.02] tracking-[-0.05em] text-[var(--text-primary)] md:max-w-none md:text-[clamp(44px,7.5vw,84px)] md:leading-[1.02] md:tracking-[-0.045em]">
          <span className="md:hidden">
            <span className="block">서비스를 하나씩 붙여도</span>
            <span className="block">루트는</span>
            <span className="relative block text-[var(--accent)]">하나로</span>
          </span>
          <span className="hidden md:inline">
            서비스를 하나씩 붙여도
            <br />
            루트는
            <br />
            <span className="text-[var(--accent)] relative">하나로</span>
          </span>
        </h1>

        <p className="m-0 max-w-[318px] text-[15px] leading-[1.68] text-[rgba(255,255,255,0.86)] md:max-w-[520px] md:text-[clamp(16px,2vw,20px)] md:leading-[1.75] md:text-[var(--text-secondary)]">
          <span className="md:hidden">
            <span className="block">yeon.world는 포털과 계정을 맡고,</span>
            <span className="block">각 서비스는 자기 경로와</span>
            <span className="block">자기 경험을 소유합니다</span>
          </span>
          <span className="hidden md:inline">
            yeon.world는 포털과 공통 계정을 맡고, 각 서비스는 자기 경로와 경험을
            독립적으로 소유합니다.
            <br className="hidden md:block" />
            상담, 타자연습, 랭킹 같은 서로 다른 서비스를 같은 구조 위에서
            확장합니다.
          </span>
        </p>

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap md:pt-2">
          <button
            className="pointer-events-auto relative z-[6] inline-flex min-h-[58px] w-full items-center justify-center gap-2.5 rounded-[20px] border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.16)] px-6 py-4 text-base font-bold text-white shadow-[0_16px_34px_rgba(0,0,0,0.18)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:border-[rgba(255,255,255,0.28)] hover:bg-[rgba(255,255,255,0.22)] hover:shadow-[0_22px_42px_rgba(0,0,0,0.24)] sm:w-auto sm:px-9 md:rounded-[14px]"
            type="button"
            onClick={onPrimaryAction}
            aria-haspopup="dialog"
            aria-controls="landing-login-modal"
          >
            {primaryActionLabel}
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
          루트는 얇게 두고
          <br />
          서비스는 깊게 만듭니다
        </h2>
        <p className="m-0 max-w-[34ch] text-[15px] leading-[1.78] text-[rgba(255,255,255,0.74)] md:max-w-none md:text-[18px] md:leading-[1.85] md:text-[var(--text-secondary)]">
          루트 포털이 모든 기능을 삼키기 시작하면 새 서비스가 붙을수록 구조가
          무거워집니다.
          <br />
          브랜드와 로그인은 공통으로 두고, 실제 경험은 서비스가 각자 깊게
          가져가야 확장이 쉬워집니다.
        </p>
      </div>
    </section>
  );
});

const ServicesSection = memo(function ServicesSection({
  services,
  isAuthenticated,
  onOpenLogin,
}: {
  services: readonly PlatformServiceDescriptor[];
  isAuthenticated: boolean;
  onOpenLogin: (nextPath: string) => void;
}) {
  return (
    <section className="relative z-[1] bg-[var(--dark-bg)] px-5 py-14 md:px-12 md:py-[120px]">
      <div
        id="services"
        className="mx-auto grid max-w-[1100px] gap-8 md:gap-10"
      >
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_320px] md:items-end">
          <div>
            <p className="m-0 text-[12px] font-bold tracking-[0.2em] uppercase text-[var(--accent)] font-mono">
              서비스 포털
            </p>
            <h2 className="m-0 max-w-[14ch] text-[clamp(28px,9vw,48px)] font-black leading-[1.08] tracking-[-0.04em] md:max-w-none md:text-[clamp(28px,4vw,48px)] md:leading-[1.15] md:tracking-[-0.025em]">
              같은 루트에서 여러 서비스를
              <br />
              독립적으로 붙입니다
            </h2>
          </div>
          <p className="m-0 text-[14px] leading-[1.75] text-[var(--text-secondary)] md:text-right">
            루트는 포털과 로그인, 계정과 서비스 목록을 맡고
            <br className="hidden md:block" />
            실제 도메인 권한과 UX는 각 서비스가 소유합니다.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {services.map((service) => {
            const isLive = service.status === platformServiceStatuses.live;
            const requiresAuth =
              service.accessPolicy ===
              platformServiceAccessPolicies.authRequired;
            const showLoginAction = isLive && requiresAuth && !isAuthenticated;
            const canOpenService = isLive && (!requiresAuth || isAuthenticated);

            return (
              <article
                key={service.slug}
                className="grid gap-4 rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.16)] md:p-6"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-[rgba(255,255,255,0.1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                    {service.slug}
                  </span>
                  <span className="inline-flex rounded-full bg-[rgba(255,255,255,0.06)] px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                    {ACCESS_POLICY_COPY[service.accessPolicy]}
                  </span>
                </div>

                <div className="grid gap-2">
                  <h3 className="m-0 text-[22px] font-bold leading-[1.18] tracking-[-0.03em]">
                    {service.title}
                  </h3>
                  <p className="m-0 text-[14px] leading-[1.7] text-[rgba(255,255,255,0.76)]">
                    {service.summary}
                  </p>
                </div>

                <p className="m-0 text-[13px] leading-[1.65] text-[var(--text-muted)]">
                  대상: {service.audience}
                </p>

                {canOpenService ? (
                  <a
                    href={service.href}
                    className="inline-flex min-h-[52px] items-center justify-center rounded-[18px] border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.12)] px-5 text-[15px] font-bold text-white no-underline transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:border-[rgba(255,255,255,0.28)] hover:bg-[rgba(255,255,255,0.18)]"
                  >
                    서비스 열기
                  </a>
                ) : showLoginAction ? (
                  <button
                    type="button"
                    className="inline-flex min-h-[52px] items-center justify-center rounded-[18px] border border-[rgba(129,140,248,0.28)] bg-[rgba(129,140,248,0.14)] px-5 text-[15px] font-bold text-white transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:border-[rgba(129,140,248,0.38)] hover:bg-[rgba(129,140,248,0.22)]"
                    onClick={() => onOpenLogin(service.href)}
                  >
                    로그인 후 열기
                  </button>
                ) : (
                  <div className="inline-flex min-h-[52px] items-center justify-center rounded-[18px] border border-dashed border-[rgba(255,255,255,0.14)] px-5 text-[15px] font-medium text-[var(--text-muted)]">
                    준비 중
                  </div>
                )}
              </article>
            );
          })}
        </div>
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
            서비스가 늘어나도
            <br />
            구조가 무너지지 않게
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
          &ldquo;루트는 포털,
          <br />
          서비스는 본체&rdquo;
        </blockquote>
        <p className="m-0 max-w-[34ch] text-[15px] leading-[1.78] text-[rgba(255,255,255,0.68)] md:max-w-none md:text-[17px] md:leading-[1.85] md:text-[var(--text-muted)]">
          {SITE_BRAND_NAME}은 루트가 모든 기능을 가져가도록 만들지 않습니다.
          <br />
          서비스가 자기 상태와 자기 UX를 직접 소유해야 장기적으로 더 빨리 확장할
          수 있습니다.
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
  onPrimaryAction,
  primaryActionLabel,
}: {
  onPrimaryAction: () => void;
  primaryActionLabel: string;
}) {
  return (
    <section className="relative z-[1] flex justify-center overflow-hidden bg-[var(--dark-bg)] px-5 py-14 text-left md:px-12 md:py-40 md:text-center">
      <div className={styles.ctaGlow} />
      <div className="relative grid max-w-[600px] gap-5 justify-items-start rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-5 py-6 shadow-[0_18px_48px_rgba(0,0,0,0.18)] md:justify-items-center md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none md:gap-7">
        <div>
          <h2 className="m-0 max-w-[11ch] text-[clamp(30px,10vw,60px)] font-black leading-[1.05] tracking-[-0.05em] md:max-w-none md:text-[clamp(34px,5.5vw,60px)] md:leading-[1.1] md:tracking-[-0.035em]">
            다음 서비스도
            <br />
            <span className="text-[var(--accent)]">{SITE_BRAND_NAME}</span>에
            붙일 준비를 하세요
          </h2>
          <p className="m-0 max-w-[32ch] text-[15px] leading-[1.72] text-[rgba(255,255,255,0.78)] md:max-w-none md:text-[18px] md:text-[var(--text-secondary)]">
            루트는 브랜드와 계정을 맡고, 각 서비스는 자기 slug 아래에서
            독립적으로 성장하게 만듭니다.
          </p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap md:w-auto md:items-center md:justify-center md:gap-4">
          <button
            className="inline-flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-[18px] border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.14)] px-6 py-4 text-base font-bold text-white shadow-[0_14px_28px_rgba(0,0,0,0.16)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:border-[rgba(255,255,255,0.26)] hover:bg-[rgba(255,255,255,0.2)] hover:shadow-[0_20px_36px_rgba(0,0,0,0.22)] sm:w-auto sm:px-9 md:rounded-[14px]"
            type="button"
            onClick={onPrimaryAction}
            aria-haspopup="dialog"
            aria-controls="landing-login-modal"
          >
            {primaryActionLabel}
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
        <div className="grid gap-4 rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-5 py-5 shadow-[0_14px_34px_rgba(0,0,0,0.14)] md:grid-cols-2 md:gap-6 md:px-6 lg:grid-cols-3">
          <div className="grid gap-2">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
              플랫폼 목적
            </p>
            <p className="m-0 text-[14px] leading-[1.8] text-[rgba(255,255,255,0.82)] md:text-[15px]">
              {SITE_PURPOSE_DESCRIPTION}
            </p>
          </div>
          <div className="grid gap-2">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Google 계정 정보 사용 안내
            </p>
            <p className="m-0 text-[13px] leading-[1.75] text-[var(--text-muted)] md:text-[14px]">
              {GOOGLE_ACCOUNT_DATA_USAGE_DESCRIPTION}
            </p>
          </div>
          <div className="grid gap-2">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              브랜드 및 문의
            </p>
            <p className="m-0 text-[13px] leading-[1.75] text-[var(--text-muted)] md:text-[14px]">
              {BRAND_REVIEW_CONTACT_DESCRIPTION}
            </p>
            <a
              href={`mailto:${SITE_SUPPORT_EMAIL}`}
              className="text-[13px] font-medium text-[var(--text-primary)] no-underline transition-colors duration-150 hover:text-[var(--accent)]"
            >
              {SITE_SUPPORT_EMAIL}
            </a>
            <p className="m-0 text-[12px] leading-[1.6] text-[var(--text-muted)]">
              서비스명: {SITE_BRAND_NAME}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-4 text-left md:flex-row md:items-center md:justify-between md:gap-3 md:text-center">
          <span className="text-[20px] font-black tracking-[-0.03em] md:text-[22px]">
            {SITE_BRAND_NAME}
          </span>
          <span className="text-[12px] leading-[1.6] text-[var(--text-muted)] md:text-[13px]">
            &copy; 2026 {SITE_BRAND_NAME}. All rights reserved.
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

  const handlePrimaryAction = useCallback(() => {
    if (isAuthenticated) {
      document
        .getElementById("services")
        ?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    handleLoginModalOpen(nextPath);
  }, [handleLoginModalOpen, isAuthenticated, nextPath]);

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleScrollToStats = useCallback(() => {
    scrollToSection("stats");
  }, [scrollToSection]);

  const primaryActionLabel = isAuthenticated
    ? "서비스 둘러보기"
    : "로그인하고 서비스 둘러보기";

  return (
    <>
      <LoginModal
        open={isLoginModalOpen}
        onClose={handleLoginModalClose}
        nextPath={loginNextPath}
        devLoginOptions={devLoginOptions}
      />
      {/* Landing shell — CSS vars defined here, dot-grid ::before in CSS module */}
      <div
        className={`${styles.landing} bg-[var(--dark-bg)] text-[var(--text-primary)] overflow-x-hidden`}
        style={LANDING_VARS}
      >
        <HeroSection
          paused={isLoginModalOpen}
          onPrimaryAction={handlePrimaryAction}
          onScrollToStats={handleScrollToStats}
          primaryActionLabel={primaryActionLabel}
        />
        <StatsSection />
        <MissionSection />
        <ServicesSection
          services={services}
          isAuthenticated={isAuthenticated}
          onOpenLogin={handleLoginModalOpen}
        />
        <FeaturesSection />
        <PhilosophySection />
        <FlowSection />
        <CtaSection
          onPrimaryAction={handlePrimaryAction}
          primaryActionLabel={primaryActionLabel}
        />
        <FooterSection />
      </div>
    </>
  );
}
