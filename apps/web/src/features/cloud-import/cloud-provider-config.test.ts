import { describe, expect, it } from "vitest";

import {
  CLOUD_PROVIDER_ORDER,
  DEFAULT_CLOUD_PROVIDER,
  getCloudProviderLabel,
} from "./cloud-provider-config";

describe("cloud-provider-config", () => {
  it("Google Drive를 기본 provider이자 첫 탭으로 둔다", () => {
    expect(DEFAULT_CLOUD_PROVIDER).toBe("googledrive");
    expect(CLOUD_PROVIDER_ORDER).toEqual(["googledrive", "onedrive"]);
  });

  it("provider 라벨을 일관되게 노출한다", () => {
    expect(getCloudProviderLabel("googledrive")).toBe("Google Drive");
    expect(getCloudProviderLabel("onedrive")).toBe("OneDrive");
  });
});
