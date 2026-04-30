const DEVELOPMENT_API_BASE_URL = "http://localhost:3000";
const LOOPBACK_HOST_PATTERN =
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?(?:\/|$)/i;

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, "");
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

export function getMobileApiBaseUrl() {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  const baseUrl = normalizeBaseUrl(
    configuredBaseUrl ?? DEVELOPMENT_API_BASE_URL,
  );

  if (isProductionRuntime()) {
    if (!configuredBaseUrl || LOOPBACK_HOST_PATTERN.test(baseUrl)) {
      throw new Error(
        "모바일 릴리즈 빌드에는 EXPO_PUBLIC_API_BASE_URL을 공개 HTTPS API 주소로 설정해야 합니다.",
      );
    }

    const url = new URL(baseUrl);

    if (url.protocol !== "https:") {
      throw new Error(
        "모바일 릴리즈 빌드는 HTTPS API 주소만 사용할 수 있습니다.",
      );
    }
  }

  return baseUrl;
}
