"use client";

import { Component, Suspense, lazy, useState, useCallback } from "react";
import type { ReactNode } from "react";
import styles from "./landing-home.module.css";

const Spline = lazy(() => import("@splinetool/react-spline"));

const SPLINE_SCENE =
  "https://prod.spline.design/3K3aYKR6mrKFknHz/scene.splinecode";

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
      return <div className={styles.splineFallback} />;
    }
    return this.props.children;
  }
}

function SplineCanvas() {
  const [error, setError] = useState(false);

  const handleError = useCallback(() => {
    setError(true);
  }, []);

  if (error) {
    return <div className={styles.splineFallback} />;
  }

  return (
    <Spline
      scene={SPLINE_SCENE}
      onError={handleError}
    />
  );
}

export function SplineHero() {
  return (
    <div className={styles.splineContainer}>
      <SplineErrorBoundary>
        <Suspense fallback={<div className={styles.splineFallback} />}>
          <SplineCanvas />
        </Suspense>
      </SplineErrorBoundary>
    </div>
  );
}
