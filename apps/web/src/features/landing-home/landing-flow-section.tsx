"use client";

import { motion } from "framer-motion";
import { FLOW_STEPS, fadeUp } from "./landing-constants";
import { RevealSection } from "./reveal-section";

export function LandingFlowSection() {
  return (
    <RevealSection className="relative z-[1] py-[120px] px-12 pb-[140px] bg-[var(--dark-surface)] md:px-6">
      <div id="flow" className="max-w-[800px] mx-auto grid gap-[72px]">
        <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
          <p className="m-0 text-[12px] font-bold tracking-[0.2em] uppercase text-[var(--accent)] font-mono">
            사용 흐름
          </p>
          <h2 className="m-0 text-[clamp(28px,4vw,48px)] font-black leading-[1.15] tracking-[-0.025em]">
            시작부터 저장까지 단순하게
          </h2>
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
                <p className="m-0 text-[15px] text-[var(--text-secondary)] leading-[1.65]">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}
