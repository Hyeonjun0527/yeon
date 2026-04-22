import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../theme/colors";

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  leftSlot?: ReactNode;
};

export function ActionButton({
  label,
  onPress,
  disabled = false,
  variant = "primary",
  leftSlot,
}: ActionButtonProps) {
  const palette = palettes[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
        },
      ]}
    >
      {leftSlot ? <View style={styles.leftSlot}>{leftSlot}</View> : null}
      <Text style={[styles.label, { color: palette.labelColor }]}>{label}</Text>
    </Pressable>
  );
}

const palettes = {
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    labelColor: colors.white,
  },
  secondary: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.borderStrong,
    labelColor: colors.text,
  },
  danger: {
    backgroundColor: "#FFF0EF",
    borderColor: "#E8B5B0",
    labelColor: colors.danger,
  },
} as const;

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "800",
  },
  leftSlot: {
    alignItems: "center",
    justifyContent: "center",
  },
});
