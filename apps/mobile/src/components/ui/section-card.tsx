import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { colors, shadow } from "../../theme/colors";

type SectionCardProps = {
  children: ReactNode;
};

export function SectionCard({ children }: SectionCardProps) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    ...shadow,
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
});
