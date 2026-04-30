import { createApiClient } from "@yeon/api-client";

import { getMobileApiBaseUrl } from "../api-base-url";

export const chatServiceApiBaseUrl = getMobileApiBaseUrl();

export const chatServiceApi = createApiClient({
  baseUrl: chatServiceApiBaseUrl,
});
