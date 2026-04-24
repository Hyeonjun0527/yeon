import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";

import { useChatServiceSession } from "../../src/providers/chat-service-session-provider";
import { colors } from "../../src/theme/colors";

export default function TabsLayout() {
  const { status } = useChatServiceSession();

  if (status === "booting") {
    return null;
  }

  if (status !== "signed_in") {
    return <Redirect href="/(auth)" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: colors.background,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surfaceStrong,
          borderTopColor: colors.border,
          height: 74,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              color={color}
              name="chatbubble-ellipses-outline"
              size={size}
            />
          ),
          tabBarLabel: "피드",
          title: "피드",
        }}
      />
      <Tabs.Screen
        name="ask"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="help-buoy-outline" size={size} />
          ),
          tabBarLabel: "에스크",
          title: "에스크",
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="people-outline" size={size} />
          ),
          tabBarLabel: "친구",
          title: "친구",
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="mail-open-outline" size={size} />
          ),
          tabBarLabel: "대화",
          title: "대화",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="person-circle-outline" size={size} />
          ),
          tabBarLabel: "프로필",
          title: "프로필",
        }}
      />
    </Tabs>
  );
}
