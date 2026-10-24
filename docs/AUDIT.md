# ELMS Comprehensive System Audit

**Audit Date:** 2026-10-24  
**Auditor:** Full-Stack & Lead Product Design Agent  
**Branch:** `feature/polish-elms`  
**Repository State:** Backend (Node/TS/Express + Prisma + Postgres), Frontend (React 18 + Vite + Tailwind), Mobile (Flutter 3.44.6 / Dart 3.12.2 Bloc)

---

## 1. Executive Summary

A comprehensive code and schema audit was conducted across the entire ELMS codebase. The system possesses a remarkably solid architectural foundation:
- **Backend**: Clean Express + TypeScript architecture with 18 route files, 18 controllers, robust JWT authentication, role-based access control, Prisma ORM schema with 26 models, and zero build errors (`tsc` passes).
- **Web Console**: Modern React 18 + Vite + Tailwind application with 20 pages (including admin user/course/category/gradebook dashboards, course builder, lesson player, checkout, quiz taking, assignment detail, certificates), zero build errors (`tsc && vite build` passes).
- **Mobile Student App**: Complete Flutter client structured using BLoC pattern, Dio API client, GoRouter navigation, Chewie video player, PDF viewer, and responsive layouts across 18 screens; `flutter analyze` passes with **zero issues**.
- **Documentation Disconnect**: Documentation in `docs/requirements/08_USER_STORIES.md` was frozen at Sprint 1, despite Sprints 2, 3, and 4 having been implemented. Furthermore, US-053 (Grade Weighting) and US-054 (Rubrics) actually have extensive backend implementations (`gradeCategory.controller.ts` and `rubric.controller.ts`) that were not connected to frontend instructor controls.

---

## 2. Classification Matrix (All 100 User Stories)

Status definitions:
- **DONE**: Implemented in backend, connected in frontend/mobile, and verified working.
- **PARTIAL**: Backend or frontend exists, but lacks end-to-end integration or specific required sub-features.
- **MISSING**: Not yet implemented.
- **BROKEN**: Exists but fails execution, errors out, or contains critical flaws.

### Sprint 1: Authentication & User Management (US-001 to US-015)
| ID | Title | Status | Notes & Code References |
|---|---|---|---|
| US-001 | Register | **DONE** | `auth.controller.ts`: register with bcrypt, email verification token |
| US-002 | Login | **DONE** | `auth.controller.ts`: JWT access (7d) + refresh token (30d) |
| US-003 | Logout | **DONE** | `auth.controller.ts`: token revocation in `RefreshToken` table |
| US-004 | User Management | **DONE** | `user.controller.ts` + `Admin/Users.tsx`: search, pagination, suspend/reactivate |
| US-005 | Role Management | **DONE** | Enum `Role` (`STUDENT`, `INSTRUCTOR`, `ADMIN`) + `requireRole` middleware |
| US-006 | Reset Password | **DONE** | `auth.controller.ts`: forgot-password, reset-password with 1h token |
| US-007 | Update Profile | **DONE** | `Profile.tsx` + `auth.controller.ts`: update profile, avatar, preferences |
| US-008 | Email Verification | **DONE** | `auth.controller.ts`: verify-email token validation |
| US-009 | Session Timeout | **DONE** | JWT expiry + Axios response interceptor for token refresh |
| US-010 | Deactivate Account | **DONE** | `auth.controller.ts`: deactivate account with password check |
| US-011 | Create Course | **DONE** | `course.controller.ts`: title, description, category, instructor assignment |
| US-012 | Update Course | **DONE** | `course.controller.ts`: ownership check, slug update |
| US-013 | Delete Course | **DONE** | `course.controller.ts`: ownership/admin check, cascade cleanup |
| US-014 | Search Course | **DONE** | `course.controller.ts` + `Courses.tsx`: title/tag search, level/category filters |
| US-015 | Course Categories | **DONE** | `category.controller.ts` + `Admin/Categories.tsx`: nested hierarchy |

---

### Sprint 2: Course & Curriculum Management (US-016 to US-030)
| ID | Title | Status | Notes & Code References |
|---|---|---|---|
| US-016 | Course Thumbnail | **DONE** | `CourseSettings.tsx` + `upload.routes.ts`: image upload and preview |
| US-017 | Course Pricing | **DONE** | `CourseSettings.tsx`: price, currency (USD/KHR), isFree toggle |
| US-018 | Course Status | **DONE** | `CourseSettings.tsx`: draft, published, archived status workflow |
| US-019 | Course Prerequisites | **DONE** | `CourseSettings.tsx`: prerequisites JSON stored and validated |
| US-020 | Course Schedule | **DONE** | `CourseSettings.tsx`: scheduled publication dates |
| US-021 | Add Modules/Sections | **DONE** | `module.controller.ts` + `CourseBuilder.tsx`: full CRUD |
| US-022 | Add Lessons | **DONE** | `lesson.controller.ts` + `CourseBuilder.tsx`: CRUD for video, pdf, text, quiz |
| US-023 | Upload Video | **PARTIAL** | Multer local upload working; needs signed expiring URLs for S3/CDN streaming |
| US-024 | Upload Documents/PDF | **DONE** | PDF upload, inline viewing with PDF.js/iframe, download toggle |
| US-025 | Attach Quiz to Lesson | **DONE** | `QuizBuilder.tsx` + `quiz.controller.ts`: 1:1 quiz attached to lesson |
| US-026 | Reorder Content | **DONE** | `@dnd-kit` drag-and-drop ordering for modules and lessons |
| US-027 | Content Preview | **DONE** | `isPreview` flag on lessons allows non-enrolled students to view |
| US-028 | Downloadable Resources | **DONE** | `attachments` JSON on lessons; inline viewing vs download query flag |
| US-029 | Content Versioning | **DONE** | `LessonVersion` snapshots created on lesson updates |
| US-030 | Drip Content Scheduling | **PARTIAL** | `dripDays` saved in DB; frontend needs clear lock banner explaining unlock date |

---

### Sprint 3: Enrollment, Assignments & Quizzes (US-031 to US-050)
| ID | Title | Status | Notes & Code References |
|---|---|---|---|
| US-031 | Self-Enroll | **DONE** | `enrollment.controller.ts`: self-enrollment with duplicate check |
| US-032 | Admin Enroll | **DONE** | `enrollment.controller.ts`: admin enroll student by ID |
| US-033 | Enrollment Approval | **PARTIAL** | Supported via waitlist approval workflow |
| US-034 | Waitlist | **DONE** | `waitlist.controller.ts`: join, leave, admin approve/reject |
| US-035 | Unenroll | **DONE** | `enrollment.controller.ts`: unenroll with status update |
| US-036 | Enrollment History | **DONE** | `MyEnrollments.tsx`: active, completed, dropped list |
| US-037 | Bulk Enroll | **DONE** | `enrollment.controller.ts`: bulk student enroll by array of user IDs |
| US-038 | Enrollment Expiration | **DONE** | `expiresAt` field in `Enrollment` model and query checks |
| US-039 | Certificate | **PARTIAL** | Verification endpoint exists (`/certificates/verify/:num`); needs PDF generation + QR code |
| US-040 | Enrollment Report | **DONE** | `enrollment.controller.ts`: enrollments aggregate report |
| US-041 | Create Assignment | **DONE** | `assignment.controller.ts`: title, description, instructions, maxPoints, dueDate |
| US-042 | Submit Assignment | **DONE** | `AssignmentDetail.tsx`: file upload, content submission |
| US-043 | Assignment Deadline | **DONE** | Deadline countdown, late submission detection |
| US-044 | Assignment File Upload | **DONE** | Multi-file upload with progress bar |
| US-045 | Create Quiz | **DONE** | `QuizBuilder.tsx`: title, timeLimit, maxAttempts, passingScore |
| US-046 | Quiz Question Types | **DONE** | MCQ, True/False, Short Answer options |
| US-047 | Auto-Grading MCQ | **DONE** | `quizAttempt.controller.ts`: instant score for MCQ/TrueFalse |
| US-048 | Quiz Timer | **DONE** | `QuizTaking.tsx`: countdown timer, autosave, auto-submit on zero |
| US-049 | Quiz Attempt Limit | **DONE** | Enforces max attempts with lockout |
| US-050 | Quiz Results | **DONE** | Detailed question breakdown with pass/fail and correct answers |

---

### Sprint 4: Grading System & Digital Payments (US-051 to US-080)
| ID | Title | Status | Notes & Code References |
|---|---|---|---|
| US-051 | Manual Grading | **DONE** | `grade.controller.ts` + `Gradebook.tsx`: score, maxPoints, feedback, letterGrade |
| US-052 | Gradebook | **DONE** | `Gradebook.tsx`: filter by course, student, pass/fail, CSV export |
| US-053 | Grade Weighting | **PARTIAL** | Backend controller `gradeCategory.controller.ts` fully built with category weights summing to 100% and weighted GPA; missing frontend UI in Course Settings |
| US-054 | Rubrics | **PARTIAL** | Backend controller `rubric.controller.ts` has full criterion/level creation & rubric grading; missing frontend rubric builder & rubric grading modal |
| US-055 | Feedback Comments | **DONE** | Instructor feedback stored on grade record, visible on student grade view |
| US-056 | Grade Export | **DONE** | CSV export endpoint `GET /grades/export` |
| US-057 | Grade Appeal | **DONE** | Student appeal filing + instructor approve/reject flow |
| US-058 | Pass/Fail Status | **DONE** | Auto-calculated from percentage (>= 60%), manually overridable |
| US-059 | GPA Calculation | **DONE** | 4.0-scale GPA computation per student across graded courses |
| US-060 | Grade Notifications | **PARTIAL** | `publishGrade` sends in-app notification + email; `respondAppeal` missing student notification/email |
| US-071 | Course Purchase | **DONE** | `payment.controller.ts` + `Checkout.tsx`: purchase courses, auto-enroll |
| US-072 | KHQR Payment | **DONE** | Sandbox KHQR generation with dynamic QR code image |
| US-073 | ABA PayWay | **DONE** | Sandbox ABA payment link generation |
| US-074 | Bakong Payment | **DONE** | Sandbox Bakong deeplink and QR |
| US-075 | Subscription Plans | **DONE** | CRUD for plans with duration and features |
| US-076 | Coupon/Discount Codes | **DONE** | Validation for percentage/fixed coupons with limits and expiry |
| US-077 | Invoice Generation | **PARTIAL** | JSON invoice generated; needs downloadable PDF invoice rendering |
| US-078 | Refund Processing | **DONE** | Admin refund with payment status update and auto-unenroll |
| US-079 | Payment History | **DONE** | `PaymentHistory.tsx` + `PaymentDetail.tsx`: transaction list and receipt view |
| US-080 | Instructor Revenue Sharing | **DONE** | Auto-creates `InstructorPayout` records (70% share) on completed payment |

---

### Sprint 5: Communication Tools & Reporting Dashboard (US-061 to US-070, US-081 to US-090)
| ID | Title | Status | Notes & Code References |
|---|---|---|---|
| US-061 | Discussion Forum | **MISSING** | No dedicated forum models/routes yet |
| US-062 | Comments on Lessons | **PARTIAL** | Prisma `Comment` model exists; missing REST API and LessonPlayer comment thread UI |
| US-063 | Direct Messaging | **MISSING** | Needs simple instructor-student direct message system |
| US-064 | Announcements | **PARTIAL** | Prisma `Announcement` and `AnnouncementRead` models exist; missing CRUD API and notification broadcast |
| US-065 | Notifications | **DONE** | Backend `notification.controller.ts` + Mobile `notifications_screen.dart`; needs Web Notification dropdown in Header |
| US-066 | Live Chat Support | **MISSING** | Needs lightweight support contact/chat widget |
| US-067 | Video Conferencing | **MISSING** | Needs Jitsi/Zoom scheduled link support on lessons/courses |
| US-068 | Q&A Section | **MISSING** | Lesson-level Q&A with upvoting and instructor "best answer" |
| US-069 | Email Notifications | **PARTIAL** | Nodemailer utility ready; needs trigger hooks for announcements, deadlines, and welcome |
| US-070 | Calendar/Schedule View | **MISSING** | Needs calendar view for upcoming assignments and quiz deadlines |
| US-081 | Student Progress Report | **PARTIAL** | Enrollment progress exists; needs analytics chart by module/lesson |
| US-082 | Course Completion Report | **PARTIAL** | Backend has raw data; needs dashboard chart |
| US-083 | Instructor Performance | **MISSING** | Aggregate ratings, courses, revenue per instructor |
| US-084 | Revenue Report | **DONE** | `GET /api/v1/payments/report/revenue` exists |
| US-085 | Enrollment Analytics | **MISSING** | Time-series chart of enrollments |
| US-086 | Quiz/Assignment Analytics | **MISSING** | Question difficulty breakdown (hardest questions analysis) |
| US-087 | Engagement Analytics | **MISSING** | Lesson view drop-off rates and completion funnel |
| US-088 | Admin Dashboard | **PARTIAL** | Dashboard has basic stats; needs rich charts and activity feed |
| US-089 | Attendance Report | **MISSING** | Login frequency and study streak records |
| US-090 | Certificate Issuance Report | **MISSING** | List and export of all issued certificates |

---

### Sprint 6: Administration, Quality & Advanced Features (US-091 to US-100)
| ID | Title | Status | Notes & Code References |
|---|---|---|---|
| US-091 | System Settings | **PARTIAL** | Prisma `Setting` model exists; needs admin CRUD API and settings page |
| US-092 | Category Management | **DONE** | `Admin/Categories.tsx` + `category.controller.ts` |
| US-093 | Site Branding | **MISSING** | Admin customization of platform name, logo, support contact, financial disclaimer |
| US-094 | Backup Database | **MISSING** | Admin trigger for pg_dump snapshot generation |
| US-095 | Restore Database | **MISSING** | Admin upload/restore mechanism with strict confirmation |
| US-096 | Audit Log | **PARTIAL** | `AuditLog` table populated on all mutations; needs Admin audit log viewer page |
| US-097 | Multi-Language (Khmer/English) | **MISSING** | Needs `i18next` for web, ARB/intl for Flutter, language switcher |
| US-098 | Mobile App Access | **PARTIAL** | Flutter app fully scaffolded and passes analysis; needs end-to-end sandbox verification |
| US-099 | AI Course Recommendation | **MISSING** | Rule-based recommendation engine (by category/history) + Gemini AI integration |
| US-100 | Gamification (Badges/Points) | **MISSING** | Points, badges, learning streak, leaderboard |

---

## 3. Discrepancies, Gaps & Architectural Nuances Found

1. **Grade Weighting & Rubrics Backend Already Exists**:
   - `backend/src/controllers/gradeCategory.controller.ts` (341 lines) and `backend/src/controllers/rubric.controller.ts` (309 lines) are fully functional and registered in `app.ts`.
   - The gap is strictly:
     - Frontend UI in `CourseSettings.tsx` to define category weights (e.g. Assignments 40%, Quizzes 30%, Final 30%).
     - Frontend UI in `AssignmentDetail.tsx` (or an instructor grading modal) to create rubrics and grade students against rubric criteria.
2. **Grade Notifications Gaps (US-060)**:
   - Grade publish already creates in-app notification and sends email.
   - Grade appeal response (`respondAppeal`) does NOT notify the student.
3. **Payments Security & Financial Integrity**:
   - Amounts in DB are stored as `Decimal(10, 2)`.
   - Idempotency key handling on `/checkout` should be formalized to prevent double charging on retry.
   - Polling / Webhook auto-resolution: checkout currently has a manual "Confirm" button in sandbox; auto-polling with countdown timer must be added to provide a real banking experience.
4. **Storage & Media Delivery**:
   - Files are currently served statically from `/uploads`.
   - To satisfy the production requirement for S3-compatible signed URLs:
     - Provide an S3/MinIO compatible storage service interface with signed expiring URLs (e.g. 2 hours expiry), keeping local fallback for offline development.
5. **Cambodia Fintech Differentiators**:
   - Missing interactive finance calculators (Loan/EMI, Compound Interest, Budget 50/30/20, Currency Converter USD/KHR).
   - Missing financial disclaimer on course and certificate views.
6. **Documentation Synchronization**:
   - Documentation was split between `elms/backend/docs/` and `elms/docs/`. Both are now synchronized to the root `docs/` and `elms/docs/`.
   - `08_USER_STORIES.md` must be updated with current real statuses.

---

## 4. Audit Verdict & Readiness

- **Backend Compile Status**: PASS (`tsc` passed cleanly)
- **Frontend Compile Status**: PASS (`tsc && vite build` passed cleanly)
- **Flutter Mobile Analysis**: PASS (`flutter analyze` — zero issues)
- **Database Schema**: 26 models in place, migrations applied
- **Ready to proceed to Proposal of Ordered Polish Plan (`docs/POLISH_PLAN.md`)**.
