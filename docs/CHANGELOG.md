# Changelog

All notable changes and progress to the ELMS project are documented in this file.

---

## Phase E Polish — 2026-10-25

### Added
- **Security Hardening**:
  - Attached strict rate limiters (`authLimiter` and `checkoutLimiter`) to authentication and payment checkout endpoints.
  - Authored comprehensive OWASP Top 10 Security Audit report in `docs/SECURITY.md`.
- **Interactive OpenAPI Documentation**:
  - Created OpenAPI 3.0 specification in `backend/src/docs/openapi.ts`.
  - Exposed interactive Swagger UI at `GET /api/docs` and schema at `GET /api/docs/swagger.json`.
- **Test Automation & Quality Assurance**:
  - Authored `auth-security.test.ts` (bcrypt hashing, roles, token rotation).
  - Authored `quiz-scoring-and-attempts.test.ts` (grading algorithms, thresholds, time limits).
  - Authored `cambodian-fintech.test.ts` (NBC exchange rates, payment idempotency).
  - Backend test suite now boasts 18 passing tests across 6 test files.
- **Production Documentation Suite**:
  - `docs/ADMIN_MANUAL.md`: System settings, audit logs, backup & recovery, and payouts.
  - `docs/USER_GUIDE.md`: Student & instructor guide covering KHQR, learning player, and certificates.
  - `docs/API.md`: API architecture, endpoint reference, and rate limiting policies.
  - `docs/DEPLOYMENT.md`: Docker Compose, environment configuration, and Nginx reverse proxy.
  - `docs/PAYMENTS.md`: Detailed Cambodian payment rails, KHQR specs, and sandbox testing.
  - `docs/DEMO_SCRIPT.md`: 5-minute evaluation walkthrough script.
  - Overhauled root `README.md` with badges, architecture overview, and quickstart commands.

---

## Phase D Polish — 2026-10-25

### Added
- **Interactive Cambodian Finance Hub on Flutter Mobile (`/finance-tools`)**:
  - Loan / EMI Amortization calculator with month-by-month principal vs interest breakdown.
  - Compound Growth & Savings projection calculator.
  - 50/30/20 Monthly Budgeting breakdown in both USD and KHR.
  - Live USD ↔ KHR currency converter with National Bank of Cambodia (NBC) reference rate (4,100 KHR).
  - Searchable Cambodian Fintech Glossary (KHQR, Bakong, NBC, CBC, EMI, AML/CFT) with bilingual terms.
- **Bilingual Localization & Context in Flutter (`LocaleCubit`)**:
  - Integrated `flutter_localizations` with English and authentic Khmer string dictionaries in `core/localization.dart`.
  - Persistent language toggle (English / ភាសាខ្មែរ KM) and low-bandwidth Data Saver toggle in `ProfileScreen`.
  - ShellScaffold bottom navigation bar dynamically reflects authentic Khmer navigation titles.
- **KHQR Mobile Payment Experience**:
  - Added active 5-minute countdown session timer for KHQR payment view.
  - Automatic status polling (every 3 seconds) against `GET /api/v1/payments/:id`.
  - Dual currency price display: `$25.00 (≈ 102,500 ៛)`.
  - Added sandbox simulation button (`POST /api/v1/payments/:id/confirm`) for immediate testing and evaluation.
- **Theme & Unit Test Automation**:
  - Aligned Flutter Material 3 theme to Emerald-500 primary (`#10B981`) and Navy-900 slate neutral tokens.
  - Added 6 automated tests in `test/widget_test.dart` and `test/finance_hub_test.dart` covering EMI calculations, budget allocations, NBC currency rate, and localization state.

---

## Phase C Polish — 2026-10-25

### Added
- **Design System & Emerald/Navy Fintech Theme**:
  - Configured `tailwind.config.js` with `darkMode: "class"`, Emerald-500 primary, Navy-900 slate neutrals, Gold badges, and Battambang/Kantumruy Pro Khmer fonts.
  - Enhanced `index.css` with dark mode utilities (`.card-dark`, `.input-dark`, `.btn-dark`, `.skeleton`).
- **4-State UI Components (`frontend/src/components/common/`)**:
  - `LoadingSkeleton.tsx`: Dedicated shimmering pulse skeletons for Course Grid, Table rows, and Metric cards.
  - `EmptyState.tsx`: High-polish empty state illustrations with action buttons.
  - `ErrorState.tsx`: Accessible retryable error component with network reconnection guidance.
- **Bilingual Localization (`i18n`)**:
  - Configured `i18next` and `react-i18next` with authentic English and Khmer (`km.json`) translations (បាគង, KHQR, ធនាគារជាតិនៃកម្ពុជា, វគ្គសិក្សា, កិច្ចការ).
  - Language switcher in main top navigation with automatic DOM font family switching.
- **Context & Navigation Chrome**:
  - `ThemeContext.tsx`: Persistent dark mode, language selector, and low-bandwidth data-saver toggle.
  - Enhanced top bar in `Layout.tsx` with Dark/Light toggle, Language switcher (`EN / KM ខ្មែរ`), and Data Saver mode.
- **Onboarding & Auth Polish**:
  - `OnboardingModal.tsx`: 3-step personalized onboarding dialog (language, fintech experience level, and learning goals).
  - `Login.tsx`: Show/hide password eye toggle, dark mode cards, and one-click demo credentials bar (Admin, Instructor, Student).
  - `Register.tsx`: Show/hide password eye toggle, real-time 4-level password strength meter, and terms of service acceptance.
- **Screen 4-State Upgrades**:
  - `Courses.tsx`: Added `CourseGridSkeleton`, `EmptyState`, and `ErrorState` with retry.
  - `MyEnrollments.tsx`: Added `TableSkeleton`, `EmptyState`, and dark-mode styling.
  - `MyGrades.tsx`: Added `TableSkeleton`, `EmptyState`, and dark-mode styling.

---

## Phase B Polish — 2026-10-25

### Added
- **Interactive Cambodian Finance Hub (`/finance-tools`)**:
  - Loan / EMI Amortization calculator with month-by-month principal vs interest breakdown.
  - Compound Interest & Savings Goal projection simulator.
  - 50/30/20 Monthly Budget Planner (USD and KHR dual currency support).
  - USD ↔ KHR Live Currency Converter with National Bank of Cambodia (NBC) reference rate (4,100 KHR).
  - Searchable Cambodian Fintech Glossary (KHQR, Bakong, NBC, EMI, CBC, AML/CFT).
- **Course Discovery & Landing Page Polish**:
  - Enriched `CourseDetail.tsx` with Learning Outcomes checklist, Prerequisites, Instructor Bio, Student Reviews (4.9/5.0), FAQ accordion, sticky Enroll/Purchase bar, and mandatory NBC educational disclaimer.
  - Enriched `Courses.tsx` with Price filter (All, Free, Paid), Sorting (Popularity, Newest, Price), and KHR equivalent badges.
- **Trustworthy Payments & KHQR Rails**:
  - Idempotency key support in `payment.controller.ts` on checkout.
  - 5-minute KHQR session countdown timer with automatic status polling every 3 seconds.
  - Manual sandbox confirmation simulation button (`POST /api/v1/payments/:id/confirm`).
  - Printable receipt generator and refund endpoint support.
- **Learning Experience Polish**:
  - `LessonPlayer.tsx` video speed controls (0.75x–2.0x), auto-advance 5s countdown banner, timestamp-linked personal notes & bookmarks, and embedded finance tools slide-over drawer.
  - Public Certificate verification view (`/verify/:certificateNumber`) with cryptographic QR generation and LinkedIn share button.
- **Instructor Quality Control & Gamification**:
  - Course Completeness Score Meter in `CourseBuilder.tsx` before publishing (outcomes, modules, lessons, pricing, quiz).
  - Study streak tracker (5 days active) and Financial Literacy Badges showcase in `Dashboard.tsx` (Fintech Pioneer, KHQR Savvy, Quiz Ace, etc.).

---

## Sprint 1 — 2026-07-10 to 2026-07-24

### Added

#### Backend
- Project foundation: Node.js + Express + TypeScript setup
- Prisma ORM with PostgreSQL schema (16 tables)
- JWT authentication with access/refresh token rotation
- Role-based access control (Student, Instructor, Admin)
- Password hashing with bcrypt (12 rounds)
- Input validation with Zod schemas
- Error handling middleware with custom AppError class
- Security middleware: Helmet, CORS, rate limiting
- Email service with Nodemailer (SMTP + mock fallback)
- Audit logging utility for all mutations
- Database seeding with demo accounts (admin, instructor, student)

#### API Endpoints
- Auth: register, login, logout, refresh, verify-email, forgot-password, reset-password
- Auth: get-me, update-profile, change-password, deactivate-account
- Users: list, get, create, update, delete, suspend, reactivate
- Courses: list, get, create, update, delete with ownership checks
- Categories: list, get, create, update, delete

#### Frontend
- React 18 + Vite + TypeScript project scaffold
- Tailwind CSS with custom design tokens
- React Router with protected route guards
- Auth context with auto token refresh and logout
- Axios instance with request/response interceptors
- Layout component with responsive sidebar navigation
- Pages: Login, Register, Dashboard, Courses, CourseDetail, Profile
- Admin pages: User Management, Course Management, Category Management
- Toast notifications with react-hot-toast

#### Infrastructure
- Docker Compose for local PostgreSQL
- `.env.example` with all required variables documented
- `package.json` with development scripts and dependencies
- TypeScript configurations for both backend and frontend

### Security
- JWT secret rotation support via environment variables
- Refresh token revocation on logout and password change
- Rate limiting: 100 requests per 15 minutes per IP
- CORS restricted to known frontend origin
- Password strength requirements enforced
- Audit logs capture: actor, action, entity, before/after values, IP, user agent

### Documentation
- `README.md` with quick start guide
- `01_PROJECT_OVERVIEW.md` — executive summary, objectives, scope
- `02_TECHNICAL_ARCHITECTURE.md` — system diagrams, principles, security
- `03_API_DOCUMENTATION.md` — endpoint reference for all Sprint 1 APIs
- `04_SPRINT_1_REPORT.md` — completed work, testing summary, metrics
- `05_SPRINT_2_PLAN.md` — upcoming work breakdown
- `06_DATABASE_SCHEMA.md` — full table documentation with ERD
- `07_SETUP_GUIDE.md` — installation and configuration instructions
- `08_USER_STORIES.md` — all 100 user stories with status tracking

---

## Sprint 2 — 2026-07-25 to 2026-08-07

### Added

#### Database
- `Quiz`, `Question`, `LessonVersion` tables added via Prisma migration
- `dripDays` and `version` fields added to `lessons` table
- 1:1 relationship between `Lesson` and `Quiz`

#### Backend APIs
- **Module CRUD**: `GET/POST /courses/:id/modules`, `PATCH/DELETE /modules/:id`, bulk reorder
- **Lesson CRUD**: `GET/POST /modules/:id/lessons`, `GET/PATCH/DELETE /lessons/:id`, bulk reorder
- **Quiz CRUD**: `GET/POST /lessons/:id/quiz`, question CRUD with MCQ/TrueFalse/ShortAnswer
- **File Upload**: Multer-based upload endpoint with type validation (videos, documents, thumbnails)
- **Static Files**: Express serves `/uploads` directory for local file access
- **Content Versioning**: Lesson snapshots saved to `LessonVersion` on content change
- **Drip Content**: `dripDays` field available for scheduling lesson unlocks
- **Ownership Checks**: All module/lesson/quiz endpoints verify instructor ownership or admin role

#### Frontend
- **CourseBuilder page**: Nested tree view of modules and lessons with expand/collapse
- **Module/Lesson Forms**: Inline create/edit with title, content type, duration, drip days, preview toggle
- **CourseSettings page**: Thumbnail upload, pricing, schedule, prerequisites, learning outcomes, tags
- **QuizBuilder page**: Dedicated question editor with MCQ options, True/False, Short Answer
- **AdminCourses page**: Added Builder and Settings links per course row
- **Upload Integration**: File upload API client with progress tracking support

#### Infrastructure
- Multer configured for 500MB max file size with disk storage
- Upload folders auto-created: `uploads/videos`, `uploads/documents`, `uploads/thumbnails`

### Security
- File type whitelist enforced per upload category (video, document, image)
- All content mutations require authentication and ownership verification
- Audit logs extended to cover module, lesson, quiz, and question operations

### Documentation
- `05_SPRINT_2_REPORT.md` — Sprint 2 completion report with metrics and retrospective
- Docs reorganized into categorized folders (`sprints/reports/`, `sprints/plans/`, `architecture/`, `api/`, etc.)

---

## Sprint 3 — 2026-08-08 to 2026-08-21 (In Progress)

### Added

#### Database
- `Waitlist`, `QuizAttempt`, `QuizAnswer`, `Certificate` tables added via Prisma migration
- Relations added to `User`, `Course`, `Quiz`, `Question`, `Enrollment` models

#### Backend APIs
- **Enrollment**: self-enroll, admin enroll, update status, unenroll, bulk enroll, enrollment report
- **Waitlist**: join, leave, process (approve auto-enrolls, reject keeps record)
- **Assignments**: CRUD, submit with deadline/late submission check, grade with auto grade record creation
- **Quiz Taking**: start attempt (enrollment + attempt limit checks), submit with auto-grading (MCQ/TrueFalse), timer enforcement, results with correct/incorrect breakdown
- **Certificates**: issue for completed enrollments, verify by number (public), list my certificates

#### Business Logic
- Enrollment rules: published courses only, duplicate prevention, reactivation support
- Quiz auto-grading: MCQ and True/False graded automatically; Short Answer left for manual grading
- Attempt limits enforced with configurable max attempts per quiz
- Timer expiry auto-fails attempt on submission
- Assignment deadline enforcement with optional late submissions
- Grading creates `Grade` records with percentage and pass/fail status

### Pending
- Frontend pages for enrollment, quiz taking, assignment submission, certificates
- Unit tests for enrollment rules, quiz grading, assignment deadlines

#### Documentation
- `06_SPRINT_3_PLAN.md` — Sprint 3 plan with backlog, technical tasks, and schedule
- `06_SPRINT_3_REPORT.md` — Sprint 3 progress report with API reference
- `09_MOBILE_APP_PLAN.md` — Flutter mobile app plan with user stories and screen list

---

## Sprint 4 — 2026-08-22 to 2026-09-04 (In Progress)

### Added

#### Database
- Added `GradeAppeal`, `Coupon`, `SubscriptionPlan`, `InstructorPayout` tables
- Added Prisma relations: `Grade.assignment`, `Grade.quiz`, `Payment.user`, `Payment.course`, `User.payments`, `User.payouts`, `Course.payments`
- Schema migration required: `prisma migrate dev` after pulling these changes

#### Backend APIs — Grading System (US-051 to US-060)
- **Grade CRUD**: `POST /grades`, `GET /grades`, `GET /grades/:id`, `PATCH /grades/:id`, `DELETE /grades/:id`
- **Manual Grading**: Instructors/admins can create and update grades with automatic percentage, letter grade, and pass/fail calculation
- **Gradebook**: Paginated grade listing with course/student filters, CSV export (`GET /grades/export`)
- **Grade Publishing**: `POST /grades/:id/publish` makes grades visible to students
- **Student Grade View**: `GET /grades/my-grades` shows only published grades for the authenticated student
- **Grade Appeal**: Students can file appeals with reason; instructors respond with approve/reject (`POST /grades/:id/appeal`, `PATCH /grades/appeals/:id`)
- **Pass/Fail Status**: Automatically computed from percentage; customizable per grade
- **GPA Calculation**: `GET /grades/course/:courseId/gpa` computes average percentage and 4.0-scale GPA per student
- **Gradebook Overview**: `GET /grades/overview` returns summary stats (total, published, pass, fail, average)

#### Backend APIs — Digital Payments (US-071 to US-080)
- **Checkout**: `POST /payments/checkout` supports course purchases and subscriptions with coupon validation
- **Payment Gateways**: Sandbox integrations for KHQR (QR code), ABA PayWay (payment URL), Bakong (deeplink/QR)
- **Payment Confirmation**: `POST /payments/:id/confirm` for sandbox completion; webhooks for real gateway callbacks (`POST /payments/webhook/:gateway`)
- **Payment History**: `GET /payments/history` with pagination and filters
- **Invoices**: `GET /payments/:id/invoice` generates structured invoice JSON with invoice number
- **Refunds**: `POST /payments/:id/refund` processes refunds with automatic unenrollment
- **Coupons**: `POST /payments/coupons`, `GET /payments/coupons`, `POST /payments/coupons/validate` — percentage and fixed discounts with usage limits and expiry
- **Subscription Plans**: `POST/GET/PATCH/DELETE /payments/subscriptions` for recurring plan management
- **Revenue Sharing**: `GET /payments/report/revenue` and `GET /payments/payouts` with instructor commission tracking; `POST /payments/payouts/:id/process` for admin payout processing

#### Frontend — Sprint 3 & 4 Pages
- **MyEnrollments**: Student enrollment dashboard with progress bars, unenroll action, and course navigation
- **MyGrades**: Student grade view with summary cards (average, passed, failed) and detailed grade table
- **Gradebook (Admin)**: Instructor/admin gradebook with search, filters, publish action, and CSV export
- **Checkout**: Course purchase page with gateway selection (KHQR, ABA PayWay, Bakong), coupon code support, and sandbox QR display
- **PaymentHistory**: Transaction list with status badges, course links, and receipt view

#### Business Logic
- Auto-enrollment on successful payment (free courses auto-complete; paid courses enroll after gateway confirmation)
- Revenue share default: 70% to instructor, auto-recorded in `InstructorPayout` on payment completion
- Grade letter calculation: A+/A/A- through F with configurable thresholds
- GPA mapped from percentage to 4.0 scale
- Coupon validation enforces expiry, usage limits, course restrictions, and global applicability

### Pending
- Prisma migration execution (`prisma migrate dev`) to apply schema changes
- Frontend unit tests for checkout flow and grade calculations
- Integration tests for payment webhooks and gateway simulations
- Real KHQR/ABA PayWay/Bakong API keys and production webhook endpoints
- PDF invoice generation (currently returns structured JSON)

#### Documentation
- Updated `08_USER_STORIES.md` — mark Sprint 4 stories in progress
- `07_SPRINT_4_PLAN.md` — Sprint 4 plan (to be created)
- `07_SPRINT_4_REPORT.md` — Sprint 4 progress report (to be created)

---

## Phase A: Core Plan Gap Closure — 2026-10-25

### Added & Completed
- **US-053 Grade Weighting**: Integrated `gradeCategory.controller.ts` with dedicated Grade Weighting section in `CourseSettings.tsx`. Enforced 100% total weight validation, visual progress bar, category breakdown, and weighted course GPA.
- **US-054 Rubrics**: Interactive Rubric Builder & grading in `AssignmentDetail.tsx`. Multi-criteria x multi-level configuration with point weights and student criteria scoring view.
- **US-060 Grade & Appeal Notifications**: Enhanced `respondAppeal` in `grade.controller.ts` with in-app `Notification` creation and `sendAppealResultEmail` dispatch. Added `NotificationDropdown.tsx` to the navigation bar with 30s live unread badge polling.
- **Assessment UI Perfection**:
  - `QuizTaking.tsx`: Added question navigation, timer countdown, auto-save to localStorage, resume on page refresh, confirmation submit modal, instant auto-grading for MCQ/TrueFalse, and detailed question breakdown with explanations.
  - `AssignmentDetail.tsx`: Multi-file drag-and-drop file upload, upload progress indicator, mime-type/size validation, deadline countdown timer, late-submission status, and submission history.
- **Sprint 5 Communication & Analytics APIs**:
  - Lesson Comments API (`comment.controller.ts` & `comment.routes.ts`) and `LessonDiscussion.tsx` with nested reply threads, user avatars, and delete controls.
  - Course Announcements API (`announcement.controller.ts` & `announcement.routes.ts`) with high-priority banners in `Dashboard.tsx` and read receipts.
  - Reporting & Analytics APIs (`report.controller.ts` & `report.routes.ts`) and `Admin/Reports.tsx` with completion rates, student progress, revenue analytics, and CSV exports.
- **Sprint 6 Admin & Quality APIs**:
  - System Settings API (`setting.controller.ts` & `setting.routes.ts`) and `Admin/Settings.tsx` with site branding, platform configurations, and maintenance mode.
  - Audit Log viewer API (`audit.controller.ts` & `audit.routes.ts`) and `Admin/AuditLogs.tsx` with filtering, pagination, and JSON delta viewer.
  - Database Backup status and snapshot download (`backup.controller.ts` & `backup.routes.ts`).
- **Test Suite**: Added Vitest test suite (`backend/src/__tests__`) covering Grade Weighting, Rubrics & Grading, and Payments & Coupons with 100% passing tests.

---

*Document Version: 1.4*  
*Last Updated: 2026-10-25*
