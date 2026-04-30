import { Stack } from "expo-router";
import { useEffect, useState } from "react";

import { AppLaunchScreen } from "../src/components/branding/app-launch-screen";
import { AppProviders } from "../src/providers/app-providers";
import { useChatServiceSession } from "../src/providers/chat-service-session-provider";

const MIN_LAUNCH_SCREEN_MS = 1200;

function RootNavigator() {
  const { status } = useChatServiceSession();
  const [isLaunchDelayDone, setIsLaunchDelayDone] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLaunchDelayDone(true);
    }, MIN_LAUNCH_SCREEN_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  if (!isLaunchDelayDone || status === "booting") {
    return <AppLaunchScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="life-os" />
      <Stack.Screen name="card-service" />
      <Stack.Screen name="card-service/decks/[deckId]" />
      <Stack.Screen name="chat/[roomId]" />
      <Stack.Screen name="profile/[profileId]" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
