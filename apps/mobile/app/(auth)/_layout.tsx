import { Redirect, Stack } from "expo-router";

import { useChatServiceSession } from "../../src/providers/chat-service-session-provider";

export default function AuthLayout() {
  const { status } = useChatServiceSession();

  if (status === "signed_in") {
    return <Redirect href="/(tabs)/feed" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
