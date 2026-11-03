import { Platform } from "react-native";

const devBaseUrl = Platform.select({
  android: "http://10.0.2.2:5000/api/v1",
  default: "http://localhost:5000/api/v1",
});

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export const API_BASE_URL = configuredBaseUrl
  ? Platform.OS === "android" && configuredBaseUrl.includes("localhost")
    ? configuredBaseUrl.replace("localhost", "10.0.2.2")
    : configuredBaseUrl
  : devBaseUrl;

const isDevelopment =
  typeof __DEV__ !== "undefined"
    ? __DEV__
    : process.env.NODE_ENV !== "production";

if (!isDevelopment && !/^https:\/\//i.test(API_BASE_URL)) {
  throw new Error(
    "Release builds require an HTTPS EXPO_PUBLIC_API_BASE_URL. Refusing to use an insecure API URL."
  );
}

const ASSET_BASE_URL = API_BASE_URL.replace(/\/api\/v\d+\/?$/i, "");

export function resolveAssetUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${ASSET_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}
