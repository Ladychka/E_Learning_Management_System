import { Platform } from "react-native";

const defaultBaseUrl = Platform.select({
  android: "http://10.0.2.2:5000/api/v1",
  default: "http://localhost:5000/api/v1",
});

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || defaultBaseUrl;

const ASSET_BASE_URL = API_BASE_URL.replace(/\/api\/v\d+\/?$/i, "");

export function resolveAssetUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${ASSET_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}
