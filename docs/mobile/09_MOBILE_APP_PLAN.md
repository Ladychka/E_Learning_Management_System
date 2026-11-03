# Mobile App Plan — Flutter Student Application

**Platform:** Flutter (iOS & Android)  
**Target Users:** Students (learners)  
**Backend:** Same Node.js/Express API (`/api/v1/*`) consumed by React web admin  
**Parallel Track:** Runs alongside Sprints 3–6 (or can be deferred post-Sprint 6 if same team builds both web and mobile)

---

## Overview

The Flutter mobile app is the **student-facing** learning platform. It mirrors the web student experience but is optimized for mobile consumption: video streaming, offline/low-bandwidth handling, and touch-native navigation. The app **never calls payment gateways or storage directly** — all business logic flows through the backend API.

---

## Architecture Principles

1. **Single API Backend** — Flutter and React admin are two separate clients of one backend. API contracts must remain stable and versioned (`/api/v1/...`).
2. **No Client-Side Payment Logic** — Checkout, KHQR/ABA/Bakong flows are initiated via backend API. The app only displays payment URLs/QR codes returned by the server.
3. **Streaming Over Download** — Finance video lessons support progressive streaming with resume capability. PDFs support progressive download.
4. **Offline Awareness** — Cache course catalog and enrolled content metadata. Flag when user is offline.
5. **State Management** — Use Riverpod or Bloc for predictable state across auth, courses, enrollment, and player screens.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Flutter 3.x |
| Language | Dart |
| State Management | Riverpod (recommended) or Bloc |
| HTTP Client | `dio` with interceptors for JWT refresh |
| Local Storage | `hive` or `shared_preferences` for tokens/cache |
| Video Player | `video_player` + `chewie` for UI controls |
| PDF Viewer | `flutter_pdfview` or `syncfusion_flutter_pdfviewer` |
| Push Notifications | `firebase_messaging` |
| Payments | WebView or external browser for KHQR/ABA/Bakong checkout URLs |

---

## User Stories (Mobile Track)

### Phase 1 — Foundation & Auth (starts once Sprint 3 APIs stabilize)

| ID | Story | Priority | API Dependencies |
|----|-------|----------|------------------|
| M-01 | Scaffold Flutter project with navigation, theming, and folder structure | High | None |
| M-02 | Implement login screen wired to `POST /api/v1/auth/login` | High | Sprint 1 |
| M-03 | Implement registration screen wired to `POST /api/v1/auth/register` | High | Sprint 1 |
| M-04 | Implement forgot/reset password flow | Medium | Sprint 1 |
| M-05 | Store and auto-refresh JWT access/refresh tokens | High | Sprint 1 |
| M-06 | Build bottom-tab navigation (Home, My Courses, Profile) | High | None |

### Phase 2 — Course Catalog & Content (parallel to Sprint 4)

| ID | Story | Priority | API Dependencies |
|----|-------|----------|------------------|
| M-07 | Course catalog list with search and filters | High | Sprint 1–2 |
| M-08 | Course detail page with modules/lessons tree | High | Sprint 2 |
| M-09 | Video lesson player with streaming, fullscreen, and progress tracking | High | Sprint 2 |
| M-10 | PDF lesson viewer with download and offline access | High | Sprint 2 |
| M-11 | Free preview support (non-enrolled users can preview preview lessons) | Medium | Sprint 2 |
| M-12 | Course enrollment via "Enroll Now" button | High | Sprint 3 |

### Phase 3 — Assessments & Progress (parallel to Sprint 4–5)

| ID | Story | Priority | API Dependencies |
|----|-------|----------|------------------|
| M-13 | Quiz taking interface with timer, question navigation, and submit | High | Sprint 3 |
| M-14 | Quiz results page with score and correct/incorrect breakdown | High | Sprint 3 |
| M-15 | Assignment submission with file upload and deadline display | Medium | Sprint 3 |
| M-16 | "My Courses" page showing enrolled courses and progress | High | Sprint 3 |
| M-17 | Progress tracking: completed lessons, overall completion percentage | Medium | Sprint 3–4 |

### Phase 4 — Payments & Certificates (parallel to Sprint 4–5)

| ID | Story | Priority | API Dependencies |
|----|-------|----------|------------------|
| M-18 | Course purchase / checkout flow initiating payment via backend | High | Sprint 4 |
| M-19 | Display KHQR code / ABA PayWay / Bakong payment URL returned by API | High | Sprint 4 |
| M-20 | Payment history list | Medium | Sprint 4 |
| M-21 | Certificate download and share (PDF) | Medium | Sprint 3 |

### Phase 5 — Communication & Polish (parallel to Sprint 5–6)

| ID | Story | Priority | API Dependencies |
|----|-------|----------|------------------|
| M-22 | Push notifications for announcements, grades, deadlines | Medium | Sprint 5 |
| M-23 | In-app notifications list | Medium | Sprint 5 |
| M-24 | Discussion forum / comments on lessons (read-only or read-write) | Low | Sprint 5 |
| M-25 | Calendar/schedule view for deadlines and live sessions | Low | Sprint 5 |
| M-26 | Offline mode: cache course content metadata and allow viewing cached lessons | Medium | Sprint 5 |

### Phase 6 — Release (end of Sprint 6)

| ID | Story | Priority | API Dependencies |
|----|-------|----------|------------------|
| M-27 | App icon, splash screen, and store assets | High | None |
| M-28 | App store (iOS) and Play Store (Android) release preparation | High | None |
| M-29 | Beta testing via TestFlight / Internal Testing | Medium | None |
| M-30 | Analytics integration (Firebase Analytics or similar) | Low | None |

---

## Screen List

| Screen | Purpose | Key Widgets |
|--------|---------|-------------|
| LoginScreen | Authenticate existing users | Form, TextField, ElevatedButton |
| RegisterScreen | Create new student account | Form, validation, date picker |
| ForgotPasswordScreen | Initiate password reset | Email input, confirmation dialog |
| HomeScreen | Course catalog, featured courses, categories | ListView, SearchBar, Chip filters |
| CourseDetailScreen | Course info, curriculum tree, enroll button | ExpansionPanel, Video thumbnail |
| LessonPlayerScreen | Video or PDF lesson viewing | VideoPlayer, PdfViewer, progress bar |
| QuizScreen | Take quiz with timer | PageView, timer widget, option cards |
| QuizResultScreen | Show score and review answers | Score badge, ListView of questions |
| MyCoursesScreen | Enrolled courses and progress | GridView, progress indicator |
| AssignmentSubmitScreen | Upload file and submit | FilePicker, upload progress |
| PaymentCheckoutScreen | Initiate and confirm payment | WebView, QR code display |
| PaymentHistoryScreen | List past transactions | ListView, status badges |
| ProfileScreen | View/edit profile, logout | Form, avatar, settings tiles |
| NotificationsScreen | List push/in-app notifications | ListView, read/unread states |
| CertificateScreen | View and download certificate | PDF viewer, share button |

---

## API Contract Summary

The Flutter app consumes the **same** endpoints as the React web app. Key endpoints by screen:

| Screen | Endpoints Used |
|--------|---------------|
| Login/Register | `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `POST /api/v1/auth/forgot-password` |
| Home/Catalog | `GET /api/v1/courses`, `GET /api/v1/categories` |
| Course Detail | `GET /api/v1/courses/:id`, `GET /api/v1/courses/:id/modules` |
| Lesson Player | `GET /api/v1/lessons/:id`, streaming URL from CDN |
| Quiz | `POST /api/v1/quizzes/:id/attempts`, `POST /api/v1/quiz-attempts/:id/submit` |
| My Courses | `GET /api/v1/users/me/enrollments` |
| Enrollment | `POST /api/v1/courses/:id/enroll` |
| Payment | `POST /api/v1/payments/checkout`, `GET /api/v1/payments/history` |
| Profile | `GET /api/v1/auth/me`, `PATCH /api/v1/auth/profile` |

> **Important:** Video/PDF content URLs returned by the API should be **signed CDN URLs** with expiration. The Flutter player passes these directly to the native video/PDF widget — no direct S3/storage access from the app.

---

## Offline / Low-Bandwidth Strategy

| Scenario | Behavior |
|----------|----------|
| User opens app offline | Show cached course catalog and enrolled courses. Flag "Offline mode" banner. |
| User starts video with poor connection | Stream at lower bitrate if adaptive streaming available; otherwise buffer with progress indicator. |
| User downloads PDF for offline | Save to app documents directory; show "Available offline" badge. |
| Quiz timer offline | Timer is server-authoritative; if connection drops during quiz, save answers locally and sync on reconnect. |
| Payment flow offline | Block payment initiation; show "Internet required" message. |

---

## Security Considerations

- **JWT tokens** stored in secure storage (`flutter_secure_storage`), not `SharedPreferences`
- **Certificate pinning** optional for API domain (recommended for production)
- **No API keys or secrets** hardcoded in Flutter code; all sensitive config comes from backend
- **Payment URLs** served by backend; app never constructs gateway URLs locally
- **Screen capture** can be blocked on video player screen (platform-specific) for content protection

---

## Suggested Start Timeline

| Sprint | Mobile Milestone |
|--------|------------------|
| Sprint 3 (Aug 8–14) | Begin Phase 1: scaffold, auth screens, tab navigation |
| Sprint 4 (Aug 15–28) | Phase 2: catalog, course detail, video/PDF player, enrollment |
| Sprint 5 (Aug 29–Sep 11) | Phase 3–4: quizzes, assignments, payments, certificates |
| Sprint 6 (Sep 12–25) | Phase 5–6: notifications, offline, polish, store submission |

---

## Notes

- The Flutter track can be resourced as a **parallel workstream** if separate mobile developers are available.
- If the same team builds both web and mobile, defer mobile start until after Sprint 6 or assign one developer to mobile while others continue web backend features.
- Keep API contracts stable — mobile is harder to update than web, so breaking API changes should be versioned (`/api/v2/...`) rather than forcing app updates.

---

*Plan Prepared: 2026-07-28*  
*Status: Planned — Ready to begin when Sprint 3 APIs are stable*
