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
      return <div className="w-full h-full bg-[var(--dark-bg)]" />;
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
    return <div className="w-full h-full bg-[var(--dark-bg)]" />;
  }

  return <Spline scene={SPLINE_SCENE} onError={handleError} />;
}

export function SplineHero() {
  return (
    <div className={`${styles.splineContainer} absolute inset-0 w-full h-full`}>
      <SplineErrorBoundary>
        <Suspense fallback={<div className="w-full h-full bg-[var(--dark-bg)]" />}>
          <SplineCanvas />
        </Suspense>
      </SplineErrorBoundary>
    </div>
  );
}
