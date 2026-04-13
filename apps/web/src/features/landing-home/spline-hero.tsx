"use client";

import {
  Component,
  memo,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ComponentType, ReactNode } from "react";
import type { Application } from "@splinetool/runtime";
import styles from "./landing-home.module.css";

const SPLINE_SCENE =
  "https://prod.spline.design/3K3aYKR6mrKFknHz/scene.splinecode";

const SPLINE_ERROR_PATTERN = /reading 'position'/;
const MOBILE_SPLINE_MEDIA_QUERY = "(max-width: 767px)";
const SPLINE_FADE_DURATION = 240;

type SplineProps = {
  scene: string;
  onLoad?: (app: Application) => void;
  renderOnDemand?: boolean;
};

type SplineComponentType = ComponentType<SplineProps>;

let splineModulePromise: Promise<{ default: SplineComponentType }> | null =
  null;
let cachedSplineComponent: SplineComponentType | null = null;

function prefetchSplineComponent() {
  if (cachedSplineComponent) {
    return Promise.resolve(cachedSplineComponent);
  }

  if (!splineModulePromise) {
    splineModulePromise = import("@splinetool/react-spline").then((module) => {
      cachedSplineComponent = module.default;
      return module;
    });
  }

  return splineModulePromise.then((module) => module.default);
}

function SplineFallbackScene() {
  return (
    <div className={styles.heroFallback} aria-hidden="true">
      <div className={styles.heroFallbackGlow} />
      <div className={styles.heroFallbackMesh} />
      <div className={styles.heroFallbackOrbit} />
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
  { children: ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return <SplineFallbackScene />;
    }
    return this.props.children;
  }
}

function SplineCanvas({ paused }: { paused: boolean }) {
  const [error, setError] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean | null>(
    null,
  );
  const [shouldLoadSpline, setShouldLoadSpline] = useState(false);
  const [SplineComponent, setSplineComponent] =
    useState<SplineComponentType | null>(cachedSplineComponent);
  const [hasLiveScene, setHasLiveScene] = useState(false);
  const splineApplicationRef = useRef<Application | null>(null);

  const handleError = useCallback(() => {
    setError(true);
  }, []);

  const handleLoad = useCallback(
    (application: Application) => {
      splineApplicationRef.current = application;
      setHasLiveScene(true);

      if (paused) {
        application.stop();
        return;
      }

      application.play();
      application.requestRender();
    },
    [paused],
  );

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
    if (isMobileViewport !== false) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      void prefetchSplineComponent().catch(() => {
        setError(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [isMobileViewport]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      isMobileViewport !== false ||
      shouldLoadSpline
    ) {
      return;
    }

    const browserWindow = window as Window & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions,
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const cleanupHandlers: Array<() => void> = [];
    let cancelled = false;

    const enableSpline = () => {
      if (cancelled) {
        return;
      }

      startTransition(() => {
        setShouldLoadSpline(true);
      });
    };

    const warmAndEnableSpline = () => {
      void prefetchSplineComponent()
        .then(() => {
          enableSpline();
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          setError(true);
        });
    };

    const registerInteractionWarmup = (eventName: keyof WindowEventMap) => {
      const handler = () => {
        warmAndEnableSpline();
      };

      window.addEventListener(eventName, handler, {
        once: true,
        passive: true,
      });

      cleanupHandlers.push(() => {
        window.removeEventListener(eventName, handler);
      });
    };

    registerInteractionWarmup("pointerdown");
    registerInteractionWarmup("touchstart");
    registerInteractionWarmup("wheel");
    registerInteractionWarmup("keydown");

    if (document.readyState === "complete") {
      if (browserWindow.requestIdleCallback) {
        const idleId = browserWindow.requestIdleCallback(() => {
          warmAndEnableSpline();
        });

        cleanupHandlers.push(() => {
          browserWindow.cancelIdleCallback?.(idleId);
        });
      } else {
        const rafId = window.requestAnimationFrame(() => {
          warmAndEnableSpline();
        });

        cleanupHandlers.push(() => {
          window.cancelAnimationFrame(rafId);
        });
      }
    } else {
      const handleWindowLoad = () => {
        warmAndEnableSpline();
      };

      window.addEventListener("load", handleWindowLoad, { once: true });

      cleanupHandlers.push(() => {
        window.removeEventListener("load", handleWindowLoad);
      });
    }

    return () => {
      cancelled = true;
      cleanupHandlers.forEach((cleanup) => cleanup());
    };
  }, [isMobileViewport, shouldLoadSpline]);

  useEffect(() => {
    if (isMobileViewport !== false || !shouldLoadSpline || error) {
      return;
    }

    let active = true;
    let frameId: number | null = null;

    void prefetchSplineComponent()
      .then((module) => {
        if (!active) {
          return;
        }

        frameId = window.requestAnimationFrame(() => {
          if (!active) {
            return;
          }

          startTransition(() => {
            setSplineComponent(() => module);
          });
        });
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setError(true);
      });

    return () => {
      active = false;
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [error, isMobileViewport, shouldLoadSpline]);

  useEffect(() => {
    const application = splineApplicationRef.current;
    if (!application) {
      return;
    }

    if (paused) {
      application.stop();
      return;
    }

    application.play();
    application.requestRender();
  }, [paused]);

  useEffect(() => {
    if (isMobileViewport !== false) {
      return;
    }

    function handleWindowError(e: ErrorEvent) {
      const message = e.message ?? "";
      if (!SPLINE_ERROR_PATTERN.test(message)) {
        return;
      }

      const filename = e.filename ?? "";
      const stack =
        e.error instanceof Error
          ? (e.error.stack ?? "")
          : String(e.error ?? "");

      if (!/spline/i.test(filename) && !/spline/i.test(stack)) {
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        console.warn("Spline 런타임 오류 감지", {
          message,
          filename,
        });
      }

      setError(true);
    }

    window.addEventListener("error", handleWindowError);
    return () => window.removeEventListener("error", handleWindowError);
  }, [isMobileViewport]);

  useEffect(() => {
    return () => {
      splineApplicationRef.current = null;
    };
  }, []);

  const hasDesktopViewport = isMobileViewport === false;
  const shouldRenderSpline =
    hasDesktopViewport && Boolean(SplineComponent) && !error;
  const shouldShowSpline = shouldRenderSpline && hasLiveScene;
  const shouldShowFallback = !hasDesktopViewport || error || !hasLiveScene;

  return (
    <>
      <div
        aria-hidden="true"
        className={`${styles.splineFallbackLayer} ${
          shouldShowFallback ? styles.splineVisible : styles.splineHidden
        }`}
      >
        <SplineFallbackScene />
      </div>
      <div
        aria-hidden={!shouldShowSpline}
        className={`${styles.splineLayer} ${
          shouldShowSpline ? styles.splineVisible : styles.splineHidden
        } ${paused ? styles.splineDimmed : ""}`}
        style={{
          transitionDuration: `${SPLINE_FADE_DURATION}ms`,
        }}
      >
        <SplineErrorBoundary onError={handleError}>
          {SplineComponent ? (
            <SplineComponent
              scene={SPLINE_SCENE}
              onLoad={handleLoad}
              renderOnDemand
            />
          ) : null}
        </SplineErrorBoundary>
      </div>
    </>
  );
}

type SplineHeroProps = {
  paused?: boolean;
};

export const SplineHero = memo(function SplineHero({
  paused = false,
}: SplineHeroProps) {
  return (
    <div
      className={`${styles.splineContainer} pointer-events-none absolute inset-0 w-full h-full`}
      data-landing-spline="true"
    >
      <SplineCanvas paused={paused} />
    </div>
  );
});
