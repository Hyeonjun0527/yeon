export const BULK_CARD_HELP_STORAGE_KEY = "yeon.card-service.bulk-help.visible";
export const BULK_CARD_HELP_VISIBILITY_EVENT = "yeon:card-service-bulk-help";

export function shouldShowBulkCardHelp() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(BULK_CARD_HELP_STORAGE_KEY) !== "hidden";
}

export function setBulkCardHelpVisible(isVisible: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  if (isVisible) {
    window.localStorage.removeItem(BULK_CARD_HELP_STORAGE_KEY);
  } else {
    window.localStorage.setItem(BULK_CARD_HELP_STORAGE_KEY, "hidden");
  }

  window.dispatchEvent(
    new CustomEvent(BULK_CARD_HELP_VISIBILITY_EVENT, {
      detail: { isVisible },
    }),
  );
}
