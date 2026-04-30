import { createApiClient } from "@yeon/api-client";

import { getMobileApiBaseUrl } from "../api-base-url";

export const lifeOsApiBaseUrl = getMobileApiBaseUrl();

export const lifeOsApi = createApiClient({
  baseUrl: lifeOsApiBaseUrl,
});
