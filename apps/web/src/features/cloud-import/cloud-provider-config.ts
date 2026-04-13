import type { CloudProvider } from "./types";

export const DEFAULT_CLOUD_PROVIDER: CloudProvider = "googledrive";

export const CLOUD_PROVIDER_ORDER = [
  DEFAULT_CLOUD_PROVIDER,
  "onedrive",
] as const satisfies readonly CloudProvider[];

export function getCloudProviderLabel(provider: CloudProvider) {
  return provider === "onedrive" ? "OneDrive" : "Google Drive";
}
