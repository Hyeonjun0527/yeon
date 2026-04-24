import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../theme/colors";

type TopBarProps = {
  title: string;
  subtitle?: string;
  rightLabel?: string;
  onRightPress?: () => void;
  rightSlot?: ReactNode;
};

export function TopBar({
  title,
  subtitle,
  rightLabel,
  onRightPress,
  rightSlot,
}: TopBarProps) {
  return (
    <View style={styles.row}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {rightSlot ? (
        rightSlot
      ) : rightLabel && onRightPress ? (
        <Pressable onPress={onRightPress} style={styles.action}>
          <Text style={styles.actionLabel}>{rightLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  titleBlock: {
    gap: 6,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  action: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionLabel: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800",
  },
});
