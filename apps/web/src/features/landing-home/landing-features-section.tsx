"use client";

import { motion } from "framer-motion";
import { FEATURES, fadeUp, staggerContainer } from "./landing-constants";
import { RevealSection } from "./reveal-section";
import styles from "./landing-workspace.module.css";

export function LandingFeaturesSection() {
  return (
    <RevealSection className="relative z-[1] py-[120px] px-12 pb-[140px] bg-[var(--dark-surface)] md:px-6">
      <div id="features" className="max-w-[1100px] mx-auto grid gap-[72px]">
        <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
          <p className="m-0 text-[12px] font-bold tracking-[0.2em] uppercase text-[var(--accent)] font-mono">
            핵심 기능
          </p>
          <h2 className="m-0 text-[clamp(28px,4vw,48px)] font-black leading-[1.15] tracking-[-0.025em]">
            상담기록이 관리와 보고로
            <br />
            바로 이어집니다
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
              <div
                className={`${styles.featureIconWrap} w-14 h-14 flex items-center justify-center rounded-2xl`}
              >
                <feat.icon size={24} strokeWidth={2} />
              </div>
              <h3 className="m-0 text-[21px] font-bold">{feat.title}</h3>
              <p className="m-0 text-[15px] leading-[1.75] text-[var(--text-secondary)]">
                {feat.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </RevealSection>
  );
}
