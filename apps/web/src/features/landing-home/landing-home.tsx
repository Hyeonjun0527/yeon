"use client";

import { useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { SplineHero } from "./spline-hero";
import { Counter } from "./counter";
import { LoginModal } from "./login-modal";
import { RevealSection } from "./reveal-section";
import { LandingFeaturesSection } from "./landing-features-section";
import { LandingFlowSection } from "./landing-flow-section";
import { STATS, fadeUp } from "./landing-constants";
import styles from "./landing-home.module.css";

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
              <span className={styles.heroTitleAccent}>
                남기기 아깝습니다
              </span>
            </motion.h1>

            <motion.p
              className={styles.heroDescription}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
            >
              켜두기만 하세요. 상담이 끝나면 기록이 완성되어 있습니다.
              <br />
              녹음 버튼 하나면 전사부터 요약, 후속 조치까지 자동으로
              정리됩니다.
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

        <LandingFeaturesSection />

        {/* ── Philosophy ── */}
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

        <LandingFlowSection />

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
          </div>
        </footer>
      </div>
    </>
  );
}
