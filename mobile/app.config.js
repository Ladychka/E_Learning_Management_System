const APP_ENV = process.env.APP_ENV || "development";

const APP_NAMES = {
  development: "FinTech ELMS Dev",
  staging: "FinTech ELMS Staging",
  production: "FinTech ELMS",
};

module.exports = ({ config }) => ({
  ...config,
  name: APP_NAMES[APP_ENV] || config.name,
  version: process.env.APP_VERSION || config.version || "1.0.0",
  ios: {
    ...config.ios,
    bundleIdentifier:
      process.env.IOS_BUNDLE_IDENTIFIER ||
      config.ios?.bundleIdentifier ||
      "com.fintech.elms",
    buildNumber: process.env.IOS_BUILD_NUMBER || config.ios?.buildNumber || "1",
  },
  android: {
    ...config.android,
    package:
      process.env.ANDROID_PACKAGE ||
      config.android?.package ||
      "com.fintech.elms",
    versionCode: Number(
      process.env.ANDROID_VERSION_CODE || config.android?.versionCode || 1
    ),
  },
  extra: {
    ...config.extra,
    appEnv: APP_ENV,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || null,
  },
});
