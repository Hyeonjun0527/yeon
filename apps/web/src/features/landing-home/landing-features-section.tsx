"use client";

import { motion } from "framer-motion";
import { FEATURES, fadeUp, staggerContainer } from "./landing-constants";
import { RevealSection } from "./reveal-section";
import styles from "./landing-home.module.css";

export function LandingFeaturesSection() {
  return (
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
  );
}
