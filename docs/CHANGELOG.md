# Changelog

All notable changes and progress to the ELMS project are documented in this file.

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

*Document Version: 1.3*  
*Last Updated: 2026-07-28*
