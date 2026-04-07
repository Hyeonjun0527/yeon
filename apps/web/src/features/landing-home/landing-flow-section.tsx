"use client";

import { motion } from "framer-motion";
import { FLOW_STEPS, fadeUp } from "./landing-constants";
import { RevealSection } from "./reveal-section";
import styles from "./landing-home.module.css";

export function LandingFlowSection() {
  return (
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
  );
}
