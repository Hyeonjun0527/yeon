import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const CHAT_SERVICE_SESSION_KEY = "chat-service-session-token";
const inMemoryStorage = new Map<string, string>();

function canUseSecureStore() {
  return (
    Platform.OS !== "web" &&
    typeof SecureStore.getItemAsync === "function" &&
    typeof SecureStore.setItemAsync === "function" &&
    typeof SecureStore.deleteItemAsync === "function"
  );
}

function getBrowserStorage() {
  if (Platform.OS !== "web") {
    return null;
  }

  return typeof globalThis.localStorage !== "undefined"
    ? globalThis.localStorage
    : null;
}

export async function readChatServiceSessionToken() {
  if (canUseSecureStore()) {
    return SecureStore.getItemAsync(CHAT_SERVICE_SESSION_KEY);
  }

  const browserStorage = getBrowserStorage();

  if (browserStorage) {
    try {
      return browserStorage.getItem(CHAT_SERVICE_SESSION_KEY);
    } catch {
      return inMemoryStorage.get(CHAT_SERVICE_SESSION_KEY) ?? null;
    }
  }

  return inMemoryStorage.get(CHAT_SERVICE_SESSION_KEY) ?? null;
}

export async function writeChatServiceSessionToken(token: string) {
  if (canUseSecureStore()) {
    await SecureStore.setItemAsync(CHAT_SERVICE_SESSION_KEY, token);
    return;
  }

  const browserStorage = getBrowserStorage();

  if (browserStorage) {
    try {
      browserStorage.setItem(CHAT_SERVICE_SESSION_KEY, token);
      return;
    } catch {
      inMemoryStorage.set(CHAT_SERVICE_SESSION_KEY, token);
      return;
    }
  }

  inMemoryStorage.set(CHAT_SERVICE_SESSION_KEY, token);
}

export async function clearChatServiceSessionToken() {
  if (canUseSecureStore()) {
    await SecureStore.deleteItemAsync(CHAT_SERVICE_SESSION_KEY);
    return;
  }

  const browserStorage = getBrowserStorage();

  if (browserStorage) {
    try {
      browserStorage.removeItem(CHAT_SERVICE_SESSION_KEY);
    } finally {
      inMemoryStorage.delete(CHAT_SERVICE_SESSION_KEY);
    }
    return;
  }

  inMemoryStorage.delete(CHAT_SERVICE_SESSION_KEY);
}
