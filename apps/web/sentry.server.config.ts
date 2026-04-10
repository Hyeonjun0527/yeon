import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // 샘플링 비율 (0.0 ~ 1.0)
  tracesSampleRate: 1.0,

  // 개발 환경에서는 Sentry 비활성화
  enabled: process.env.NODE_ENV === "production",

  // 민감한 데이터 필터
  beforeSend(event) {
    return event;
  },
});
