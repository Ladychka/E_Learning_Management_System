import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "elms_access_token";
const REFRESH_TOKEN_KEY = "elms_refresh_token";

const useSecureStore = Platform.OS !== "web";
const webMemoryStore = new Map<string, string>();

async function setItem(key: string, value: string) {
  if (useSecureStore) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  // Web is a preview target for this mobile app. Tokens stay in memory only so
  // they are never written to localStorage/IndexedDB.
  webMemoryStore.set(key, value);
}

async function getItem(key: string) {
  if (useSecureStore) {
    return SecureStore.getItemAsync(key);
  }
  return webMemoryStore.get(key) ?? null;
}

async function removeItem(key: string) {
  if (useSecureStore) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  webMemoryStore.delete(key);
}

export const tokenStorage = {
  async save(accessToken: string, refreshToken: string) {
    await Promise.all([
      setItem(ACCESS_TOKEN_KEY, accessToken),
      setItem(REFRESH_TOKEN_KEY, refreshToken),
    ]);
  },

  async getAccessToken() {
    return getItem(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken() {
    return getItem(REFRESH_TOKEN_KEY);
  },

  async clear() {
    await Promise.all([
      removeItem(ACCESS_TOKEN_KEY),
      removeItem(REFRESH_TOKEN_KEY),
    ]);
  },
};
