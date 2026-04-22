import { Image, StyleSheet, Text, View } from "react-native";

import { createInitials } from "../../lib/format";
import { colors } from "../../theme/colors";

type AvatarCircleProps = {
  label: string;
  imageUrl?: string | null;
  size?: number;
  tone?: "accent" | "warm";
};

export function AvatarCircle({
  label,
  imageUrl,
  size = 48,
  tone = "accent",
}: AvatarCircleProps) {
  const backgroundColor =
    tone === "accent" ? colors.accentSoft : colors.warmSoft;
  const textColor = tone === "accent" ? colors.accent : colors.warm;

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ borderRadius: size / 2, height: size, width: size }}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        { backgroundColor, borderRadius: size / 2, height: size, width: size },
      ]}
    >
      <Text style={[styles.initials, { color: textColor }]}>
        {createInitials(label)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderWidth: 1,
    justifyContent: "center",
  },
  initials: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
