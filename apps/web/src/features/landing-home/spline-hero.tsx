"use client";

import {
  Component,
  Suspense,
  lazy,
  useState,
  useCallback,
  useEffect,
} from "react";
import type { ReactNode } from "react";
import styles from "./landing-home.module.css";

const Spline = lazy(() => import("@splinetool/react-spline"));

const SPLINE_SCENE =
  "https://prod.spline.design/3K3aYKR6mrKFknHz/scene.splinecode";

const SPLINE_ERROR_PATTERN = /reading 'position'/;

function SplineFallbackScene() {
  return (
    <div className={styles.heroFallback} aria-hidden="true">
      <div className={styles.heroFallbackGlow} />
      <div className={styles.heroFallbackBeam} />
      <div className={styles.heroFallbackPulse} />
      <div className={styles.heroFallbackMesh} />
      <div className={styles.heroFallbackOrbit} />
      <div className={styles.heroFallbackOrbitSecondary} />
      <div className={styles.heroFallbackDataLane}>
        <span />
        <span />
        <span />
      </div>
      <div className={styles.heroFallbackColumn}>
        <div className={styles.heroFallbackCard}>
          <span className={styles.heroFallbackEyebrow}>LIVE RECORD</span>
          <strong>상담이 끝나는 순간, 기록은 이미 정리됩니다</strong>
          <p>
            원문부터 요약, 다음 액션까지 한 흐름으로 이어지는 상담 워크스페이스.
          </p>
        </div>
        <div className={styles.heroFallbackMiniStack}>
          <div className={styles.heroFallbackMiniCard}>
            <span>RECORD</span>
            <strong>원문 누락 없이 남기기</strong>
          </div>
          <div className={styles.heroFallbackMiniCard}>
            <span>FOLLOW-UP</span>
            <strong>후속 조치까지 바로 연결</strong>
          </div>
        </div>
        <div className={styles.heroFallbackSignalRow}>
          <div className={styles.heroFallbackSignal}>
            <span>전사</span>
            <strong>긴 상담도 안정적으로</strong>
          </div>
          <div className={styles.heroFallbackSignal}>
            <span>요약</span>
            <strong>실무형 구조로 정리</strong>
          </div>
          <div className={styles.heroFallbackSignal}>
            <span>후속조치</span>
            <strong>다음 상담 준비까지</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

class SplineErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <SplineFallbackScene />;
    }
    return this.props.children;
  }
}

function SplineCanvas() {
  const [error, setError] = useState(false);

  const handleError = useCallback(() => {
    setError(true);
  }, []);

  useEffect(() => {
    function suppress(e: ErrorEvent) {
      if (SPLINE_ERROR_PATTERN.test(e.message)) {
        e.preventDefault();
      }
    }
    window.addEventListener("error", suppress);
    return () => window.removeEventListener("error", suppress);
  }, []);

  if (error) {
    return <SplineFallbackScene />;
  }

  return <Spline scene={SPLINE_SCENE} onError={handleError} />;
}

export function SplineHero() {
  return (
    <div className={`${styles.splineContainer} absolute inset-0 w-full h-full`}>
      <SplineErrorBoundary>
        <Suspense fallback={<SplineFallbackScene />}>
          <SplineCanvas />
        </Suspense>
      </SplineErrorBoundary>
    </div>
  );
}
