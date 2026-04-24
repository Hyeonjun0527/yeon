import { Image, StyleSheet, View } from "react-native";

import splashAnimalImage from "../../../assets/images/chat-service-splash-animal.png";
import { colors } from "../../theme/colors";

export function AppLaunchScreen() {
  return (
    <View style={styles.screen}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={splashAnimalImage}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },
  image: {
    height: "100%",
    width: "100%",
  },
});
