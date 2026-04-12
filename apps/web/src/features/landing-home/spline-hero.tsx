"use client";

import { Component, memo, useState, useCallback, useEffect } from "react";
import type { ComponentType, ReactNode } from "react";
import styles from "./landing-home.module.css";

const SPLINE_SCENE =
  "https://prod.spline.design/3K3aYKR6mrKFknHz/scene.splinecode";

const SPLINE_ERROR_PATTERN = /reading 'position'/;
const MOBILE_SPLINE_MEDIA_QUERY = "(max-width: 767px)";

function SplineFallbackScene() {
  return (
    <div className={styles.heroFallback} aria-hidden="true">
      <div className={styles.heroFallbackGlow} />
      <div className={styles.heroFallbackColumn}>
        <div className={styles.heroFallbackCard}>
          <span className={styles.heroFallbackEyebrow}>LIVE RECORD</span>
          <strong>상담이 끝나는 순간, 기록은 이미 정리됩니다</strong>
          <p>
            원문부터 요약, 다음 액션까지 한 흐름으로 이어지는 상담 워크스페이스.
          </p>
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
  const [isMobileViewport, setIsMobileViewport] = useState<boolean | null>(
    null,
  );
  const [shouldLoadSpline, setShouldLoadSpline] = useState(false);
  const [SplineComponent, setSplineComponent] = useState<ComponentType<{
    scene: string;
    onError?: () => void;
  }> | null>(null);

  const handleError = useCallback(() => {
    setError(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_SPLINE_MEDIA_QUERY);
    const syncViewport = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    syncViewport();

    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || isMobileViewport !== false) {
      return;
    }

    const browserWindow = window as Window & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions,
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const enableSpline = () => {
      setShouldLoadSpline(true);
    };

    if (browserWindow.requestIdleCallback) {
      const idleId = browserWindow.requestIdleCallback(enableSpline, {
        timeout: 1500,
      });

      return () => {
        browserWindow.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = globalThis.setTimeout(enableSpline, 1200);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [isMobileViewport]);

  useEffect(() => {
    if (isMobileViewport !== false || !shouldLoadSpline) {
      return;
    }

    let active = true;

    void import("@splinetool/react-spline")
      .then((module) => {
        if (!active) {
          return;
        }

        setSplineComponent(() => module.default);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setError(true);
      });

    return () => {
      active = false;
    };
  }, [isMobileViewport, shouldLoadSpline]);

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

  if (isMobileViewport !== false) {
    return <SplineFallbackScene />;
  }

  if (!shouldLoadSpline) {
    return <SplineFallbackScene />;
  }

  if (!SplineComponent) {
    return <SplineFallbackScene />;
  }

  return <SplineComponent scene={SPLINE_SCENE} onError={handleError} />;
}

export const SplineHero = memo(function SplineHero() {
  return (
    <div
      className={`${styles.splineContainer} pointer-events-none absolute inset-0 w-full h-full`}
      data-landing-spline="true"
    >
      <SplineErrorBoundary>
        <SplineCanvas />
      </SplineErrorBoundary>
    </div>
  );
});
