import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors } from "../../theme/colors";

type StateBlockProps = {
  title: string;
  message: string;
  loading?: boolean;
};

export function StateBlock({
  title,
  message,
  loading = false,
}: StateBlockProps) {
  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator color={colors.accent} size="small" />
      ) : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    justifyContent: "center",
    minHeight: 180,
    padding: 20,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
