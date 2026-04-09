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
              좋은 상담은
              <br />
              기억에만
              <br />
              <span className={styles.heroTitleAccent}>남기기 아깝습니다</span>
            </motion.h1>

            <motion.p
              className={styles.heroDescription}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
            >
              켜두기만 하세요. 상담이 끝나면 기록이 완성되어 있습니다.
              <br />
              녹음 버튼 하나면 전사부터 요약, 후속 조치까지 자동으로 정리됩니다.
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
                시작하기
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
            <div className={styles.footerLinks}>
              <a href="/privacy" className={styles.footerLink}>
                개인정보처리방침
              </a>
              <a href="/terms" className={styles.footerLink}>
                서비스 이용약관
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
