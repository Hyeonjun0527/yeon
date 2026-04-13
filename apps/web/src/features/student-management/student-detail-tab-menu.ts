export const TAB_LONG_PRESS_DELAY_MS = 420;

export function canOpenTabContextMenu(
  isEditable: boolean | undefined,
  hasHandler: boolean,
) {
  return Boolean(isEditable && hasHandler);
}

export function getLongPressTabMenuPosition(rect: {
  left: number;
  width: number;
  bottom: number;
}) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.bottom + 8,
  };
}
