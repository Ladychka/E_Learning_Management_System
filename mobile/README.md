# ELMS Mobile App (Flutter)

Student-facing Flutter application for the E-Learning Management System (ELMS).

## Features

### Authentication
- Login / Register with email and password
- JWT access + refresh token handling with auto-refresh on 401
- Profile viewing, editing, and password change
- Logout with token cleanup

### Course Catalog
- Browse all published courses
- Full-text search across titles and descriptions
- Course detail with curriculum (modules → lessons)
- Course assignments tab
- Pull-to-refresh on course list

### Lesson Player
- **Video**: Native playback via `video_player` + `chewie` with fullscreen support
- **PDF**: Document viewer with fallback to external open
- **Text**: Rich text content display
- **Quiz**: Start quiz directly from lesson player
- Curriculum sidebar for lesson navigation
- Landscape fullscreen mode for video

### Enrollments
- Self-enrollment (free courses enroll instantly)
- Paid course checkout with 3 payment gateways:
  - **KHQR** — QR code display for scanning
  - **ABA PayWay** — Web payment URL
  - **Bakong** — Deeplink + QR code
- My Enrollments with progress bars and status badges
- Pull-to-refresh

### Quiz & Assessments
- Start quiz attempts with backend-validated enrollment checks
- Timer support with auto-submit on expiry
- Question types: MCQ, True/False, Short Answer
- Answer review after submission
- Results with score circle and per-question breakdown

### Assignments
- View course assignments with due dates
- Submit text-based answers
- View submission status, score, and instructor feedback

### Grades
- View all published grades with pass/fail status
- Progress bars showing score percentage
- Feedback display

### Notifications
- In-app notification list with type-based icons/colors
- Mark single or all as read
- Unread badge on Dashboard app bar and Profile nav
- Pull-to-refresh

### Payments
- Payment history with status badges
- Invoice links (when available)
- Checkout flow with coupon code support

## Architecture

```
lib/
├── core/
│   ├── constants.dart          # API base URL, timeouts
│   └── errors.dart             # Failure hierarchy
├── data/
│   ├── models/                 # Equatable models with JSON parsing
│   │   ├── user_model.dart
│   │   ├── course_model.dart
│   │   ├── module_model.dart
│   │   ├── lesson_model.dart
│   │   ├── enrollment_model.dart
│   │   ├── notification_model.dart
│   │   ├── payment_model.dart
│   │   ├── quiz_model.dart
│   │   ├── assignment_model.dart
│   │   ├── grade_model.dart
│   │   └── checkout_model.dart
│   └── services/
│       ├── auth_service.dart   # Token storage via SharedPreferences
│       └── api_service.dart    # Dio with interceptors (auth + refresh)
├── presentation/
│   ├── blocs/                  # Flutter Bloc (Cubit) state management
│   │   ├── auth/
│   │   ├── course/
│   │   ├── enrollment/
│   │   ├── notification/
│   │   ├── quiz/
│   │   ├── assignment/
│   │   └── grade/
│   ├── screens/                # One screen per route
│   │   ├── login_screen.dart
│   │   ├── register_screen.dart
│   │   ├── dashboard_screen.dart
│   │   ├── courses_screen.dart
│   │   ├── course_detail_screen.dart
│   │   ├── lesson_player_screen.dart
│   │   ├── quiz_take_screen.dart
│   │   ├── quiz_results_screen.dart
│   │   ├── assignment_detail_screen.dart
│   │   ├── my_enrollments_screen.dart
│   │   ├── notifications_screen.dart
│   │   ├── payment_history_screen.dart
│   │   ├── grades_screen.dart
│   │   ├── checkout_screen.dart
│   │   ├── edit_profile_screen.dart
│   │   ├── change_password_screen.dart
│   │   ├── profile_screen.dart
│   │   └── shell_scaffold.dart
│   └── router/
│       └── app_router.dart     # GoRouter with auth guards
└── main.dart
```

## Tech Stack

| Package | Purpose |
|---------|---------|
| `flutter_bloc` | State management (Cubit pattern) |
| `go_router` | Declarative routing with shell routes |
| `dio` | HTTP client with interceptors |
| `shared_preferences` | Local token storage |
| `equatable` | Value equality for models |
| `cached_network_image` | Thumbnail caching |
| `video_player` + `chewie` | Video lesson playback |
| `flutter_pdfview` | PDF document viewing |
| `file_picker` | Assignment file uploads |
| `url_launcher` | Open payment URLs |
| `webview_flutter` | Payment gateway webviews |
| `intl` | Date/number formatting |

## API Integration

All screens consume the existing Node.js/Express backend (`/api/v1/*`):

- `POST /auth/login`, `/auth/register`, `/auth/logout`
- `GET /auth/me`, `PATCH /auth/profile`
- `GET /courses`, `/courses/:id`, `/courses/:id/modules`
- `GET /lessons/:id`
- `POST /enrollments/enroll`, `GET /enrollments/my-enrollments`
- `GET /notifications/my`, `PATCH /notifications/:id/read`
- `GET /payments/history`, `POST /payments/checkout`
- `GET /quizzes/lessons/:lessonId/quiz`
- `POST /quiz-attempts/attempts`, `/quiz-attempts/attempts/:id/submit`
- `GET /assignments`, `/assignments/:id`, `POST /assignments/:id/submit`
- `GET /grades/my-grades`

## Getting Started

```bash
cd elms/mobile
flutter pub get
flutter run
```

For Android emulator, ensure the backend URL in `lib/core/constants.dart` points to `10.0.2.2:5000` (or your machine's LAN IP for a physical device).

## Build

```bash
# Android APK
flutter build apk --release

# Android App Bundle
flutter build appbundle --release

# iOS
flutter build ios --release
```
