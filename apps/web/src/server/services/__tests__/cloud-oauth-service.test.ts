import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getOAuthUrl as getGoogleDriveOAuthUrl } from "../googledrive-service";
import { getOAuthUrl as getOneDriveOAuthUrl } from "../onedrive-service";

describe("cloud OAuth service", () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
    process.env.MICROSOFT_CLIENT_ID = "microsoft-client-id";
    process.env.MICROSOFT_CLIENT_SECRET = "microsoft-client-secret";
    process.env.NEXT_PUBLIC_APP_URL = "https://yeon.world";
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("Google Drive OAuth URL은 counseling-service callback URI를 사용한다", () => {
    const url = new URL(getGoogleDriveOAuthUrl("google-state"));

    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://yeon.world/counseling-service/api/v1/integrations/googledrive/auth/callback",
    );
  });

  it("OneDrive OAuth URL은 counseling-service callback URI를 사용한다", () => {
    const url = new URL(getOneDriveOAuthUrl("onedrive-state"));

    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://yeon.world/counseling-service/api/v1/integrations/onedrive/auth/callback",
    );
  });
});
