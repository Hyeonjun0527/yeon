import { createApiClient } from "@yeon/api-client";

import { getMobileApiBaseUrl } from "../api-base-url";

export const cardServiceApiBaseUrl = getMobileApiBaseUrl();

export const cardServiceApi = createApiClient({
  baseUrl: cardServiceApiBaseUrl,
});
