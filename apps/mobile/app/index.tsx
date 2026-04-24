import { Redirect } from "expo-router";

import { useChatServiceSession } from "../src/providers/chat-service-session-provider";

export default function IndexRoute() {
  const { status } = useChatServiceSession();

  if (status === "signed_in") {
    return <Redirect href="/(tabs)/feed" />;
  }

  return <Redirect href="/(auth)" />;
}
