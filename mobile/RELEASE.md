# ELMS Mobile Release Guide

This guide is for the Expo student app in `elms/mobile`. The backend, web app,
and payment provider configuration are separate.

## Prerequisites

- Node.js 20+ and npm.
- An Expo account and an EAS account.
- A Google Play Developer account for Android submission.
- Android signing credentials (EAS-managed or an uploaded keystore).
- The production API URL and backend/PayWay production configuration.

## Environment profiles

The app reads `EXPO_PUBLIC_API_BASE_URL` at build time. Release builds require an
HTTPS URL; development may use the Android emulator fallback
`http://10.0.2.2:5000/api/v1` or `http://localhost:5000/api/v1`.

| Profile | `APP_ENV` | API URL source |
| --- | --- | --- |
| Development | `development` | `.env.development` or EAS `development` env |
| Preview/staging | `staging` | `.env.staging` or EAS `preview` env |
| Production | `production` | `.env.production` or EAS `production` env |

Replace the placeholder URLs in `eas.json`, `.env.staging`, and
`.env.production` before building. Never commit real secrets.

## Install and verify

```bash
cd elms/mobile
npm ci
npx expo install --check
npx tsc --noEmit
npm test
npx expo export --platform web
```

## EAS setup

```bash
cd elms/mobile
npx eas-cli login
npx eas-cli init
```

`eas init` creates/links the EAS project and adds the project ID to the Expo
config. Commit the resulting non-secret project ID.

Configure signing (choose one):

```bash
# Let EAS manage the Android keystore
npx eas-cli credentials --platform android

# Or upload an existing keystore when prompted
npx eas-cli credentials --platform android
```

## Android builds

### Development build

```bash
npx eas-cli build --profile development --platform android
```

### Preview APK for testers

```bash
npx eas-cli build --profile preview --platform android
```

EAS prints the APK URL. Install it on a test device and complete the smoke test.

### Production AAB for Google Play

```bash
npx eas-cli build --profile production --platform android
```

### Local build (requires Android SDK and a logged-in EAS account)

```bash
npx eas-cli build --profile preview --platform android --local
```

### Submit to Google Play

```bash
npx eas-cli submit --platform android --profile production
```

Set `EXPO_PUBLIC_API_BASE_URL` for the production build before submitting. The
placeholder `https://api.elms.example.com/api/v1` must be replaced in EAS
environment variables or `eas.json`.

## Google Play submission checklist

- [ ] Replace the production API URL placeholder with the real HTTPS URL.
- [ ] Confirm `android.package` (`com.fintech.elms`) is the intended permanent ID.
- [ ] Confirm app name, icon, adaptive icon, and splash screen.
- [ ] Increment version/versionCode for every upload (EAS production auto-increments).
- [ ] Provide a 512x512 Play Store icon and a 1024x500 feature graphic.
- [ ] Provide phone screenshots for the main flows.
- [ ] Write the short and full store descriptions.
- [ ] Provide a public privacy policy URL.
- [ ] Complete the Play Console Data safety form.
- [ ] Complete the content rating questionnaire.
- [ ] Declare target audience and ads status.
- [ ] Confirm target API level requirements.
- [ ] Upload the AAB to the internal test track first.
- [ ] Run the closed test with real testers if required by the account.
- [ ] Review pre-launch report warnings and fix crashes/ANRs.
- [ ] Promote the release to production after approval.
- [ ] Keep the signing keystore and Play service account key backed up securely.

## Verification performed

- `npx tsc --noEmit`: mobile and backend pass.
- `npm test`: 10 suites / 31 tests pass.
- Backend `npx vitest run`: 8 files / 34 tests pass.
- `npx expo export --platform web` with an HTTPS placeholder API URL passes.
- Seeded UI flows passed: login, free enrollment, lesson completion, quiz,
  assignment submission/grades, paid checkout with webhook success,
  notifications, and profile/password settings.
- The seed ran twice with no duplicate users, enrollments, lesson completions,
  course slugs, or certificate numbers.

## Manual steps still required

1. Create/confirm an Expo account and an EAS account, then run `npx eas-cli init`.
2. Replace the production API URL placeholder with the real HTTPS URL.
3. Configure Android signing keys with EAS or upload the production keystore.
4. Add the Play Console service account key at
   `elms/mobile/secrets/play-service-account.json` (ignored by git).
5. Configure backend ABA PayWay production credentials
   (`ABA_PAYWAY_MERCHANT_ID`, `ABA_PAYWAY_API_KEY`,
   `ABA_PAYWAY_API_SECRET`) in the backend environment, never in the mobile app.
6. Configure a public HTTPS webhook/callback URL for PayWay and set the backend
   payment webhook secret.
7. Run one real sandbox payment through the production-like backend and confirm
   the webhook/polling flow activates enrollment.
8. Publish a privacy policy and complete the Google Play listing and data-safety
   forms.
9. Test the production AAB on a physical device with the real API before rollout.
10. If the final package ID differs, update `android.package` and
    `ios.bundleIdentifier` before the first store upload.
