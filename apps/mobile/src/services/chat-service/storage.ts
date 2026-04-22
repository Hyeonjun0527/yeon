import * as SecureStore from "expo-secure-store";

const CHAT_SERVICE_SESSION_KEY = "chat-service-session-token";

export async function readChatServiceSessionToken() {
  return SecureStore.getItemAsync(CHAT_SERVICE_SESSION_KEY);
}

export async function writeChatServiceSessionToken(token: string) {
  await SecureStore.setItemAsync(CHAT_SERVICE_SESSION_KEY, token);
}

export async function clearChatServiceSessionToken() {
  await SecureStore.deleteItemAsync(CHAT_SERVICE_SESSION_KEY);
}
