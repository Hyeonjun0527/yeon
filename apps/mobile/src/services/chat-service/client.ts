import { createApiClient } from "@yeon/api-client";

const fallbackBaseUrl = "http://localhost:3000";

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, "");
}

export const chatServiceApiBaseUrl = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL ?? fallbackBaseUrl,
);

export const chatServiceApi = createApiClient({
  baseUrl: chatServiceApiBaseUrl,
});
