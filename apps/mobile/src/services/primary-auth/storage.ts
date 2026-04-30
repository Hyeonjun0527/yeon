import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const PRIMARY_AUTH_SESSION_TOKEN_KEY = "yeon.primary-auth.session-token";
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

export async function readPrimaryAuthSessionToken() {
  if (canUseSecureStore()) {
    return SecureStore.getItemAsync(PRIMARY_AUTH_SESSION_TOKEN_KEY);
  }

  const browserStorage = getBrowserStorage();

  if (browserStorage) {
    try {
      return browserStorage.getItem(PRIMARY_AUTH_SESSION_TOKEN_KEY);
    } catch {
      return inMemoryStorage.get(PRIMARY_AUTH_SESSION_TOKEN_KEY) ?? null;
    }
  }

  return inMemoryStorage.get(PRIMARY_AUTH_SESSION_TOKEN_KEY) ?? null;
}

export async function writePrimaryAuthSessionToken(sessionToken: string) {
  if (canUseSecureStore()) {
    await SecureStore.setItemAsync(
      PRIMARY_AUTH_SESSION_TOKEN_KEY,
      sessionToken,
    );
    return;
  }

  const browserStorage = getBrowserStorage();

  if (browserStorage) {
    try {
      browserStorage.setItem(PRIMARY_AUTH_SESSION_TOKEN_KEY, sessionToken);
      return;
    } catch {
      inMemoryStorage.set(PRIMARY_AUTH_SESSION_TOKEN_KEY, sessionToken);
      return;
    }
  }

  inMemoryStorage.set(PRIMARY_AUTH_SESSION_TOKEN_KEY, sessionToken);
}

export async function clearPrimaryAuthSessionToken() {
  if (canUseSecureStore()) {
    await SecureStore.deleteItemAsync(PRIMARY_AUTH_SESSION_TOKEN_KEY);
    return;
  }

  const browserStorage = getBrowserStorage();

  if (browserStorage) {
    try {
      browserStorage.removeItem(PRIMARY_AUTH_SESSION_TOKEN_KEY);
    } finally {
      inMemoryStorage.delete(PRIMARY_AUTH_SESSION_TOKEN_KEY);
    }
    return;
  }

  inMemoryStorage.delete(PRIMARY_AUTH_SESSION_TOKEN_KEY);
}
