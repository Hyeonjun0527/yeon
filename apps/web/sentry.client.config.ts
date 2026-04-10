import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 샘플링 비율 (0.0 ~ 1.0)
  tracesSampleRate: 1.0,

  // 개발 환경에서는 Sentry 비활성화
  enabled: process.env.NODE_ENV === "production",

  // 리플레이 설정 (선택 사항)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
