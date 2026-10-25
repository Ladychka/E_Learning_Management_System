# ELMS Comprehensive Polish & Production Readiness Plan

**Created:** 2026-10-24  
**Author:** Full-Stack & Lead Product Design Agent  
**Branch:** `feature/polish-elms`  
**Reference Document:** `ELMS_PROJECT_PLAN.md`

---

## Architecture Principles & Guardrails

1. **Non-destructive & Additive**: Zero dropping of tables or breaking database changes; new Prisma migrations only.
2. **Contract Stability**: Existing `/api/v1/...` routes preserve their contract signatures and response structures.
3. **Clean Module Isolation**: Payment adapters remain strictly isolated within the backend payment module.
4. **Bilingual & Multi-Currency**: Khmer + English (i18n), USD + KHR, optimized for low-bandwidth Cambodian mobile connections.
5. **Quality Gates**: Verification via type-check, lint, automated test suite, and compilation checks at the completion of each phase.

---

## Phase Breakdown

### Phase A: Core Plan Gap Closure (Sprints 4, 5, 6 Essentials)
- [x] **A1. US-053 Grade Weighting Integration**:
  - Connect existing `gradeCategory.controller.ts` with a dedicated Grade Weighting section in `frontend/src/pages/CourseSettings.tsx`.
  - Validate that categories (e.g., Assignments 40%, Quizzes 30%, Final 30%) sum to 100%.
  - Display weighted course GPA in Gradebook and student MyGrades.
- [x] **A2. US-054 Rubrics Integration**:
  - Add Rubric Builder modal to `frontend/src/pages/AssignmentDetail.tsx` and `CourseBuilder.tsx`.
  - Add Rubric Grading interface for instructors when grading submissions.
  - Display interactive rubric breakdown to students upon viewing their grade.
- [x] **A3. US-060 Grade & Appeal Notifications**:
  - Enhance `respondAppeal` in `grade.controller.ts` to issue in-app `Notification` and trigger email to student.
  - Wire notifications dropdown into Web navigation bar with live unread badge.
- [x] **A4. Assessment UI Perfection**:
  - Verify and polish `QuizTaking.tsx`: timer autosave to localStorage, resume on page refresh, confirmation modal before submit, clear breakdown with explanations.
  - Verify and polish `AssignmentDetail.tsx`: drag-and-drop file upload, upload progress indicator, mime-type/size validation, deadline countdown, late-submission tag.
- [x] **A5. Sprint 5 Communication & Analytics APIs**:
  - Lesson Comments API (`/api/v1/lessons/:id/comments`) & LessonPlayer comment thread UI.
  - Course Announcements API (`/api/v1/courses/:id/announcements`) with broadcast to enrolled students.
  - Course Q&A / Discussion Forum API (`/api/v1/courses/:id/qa`).
  - Reporting APIs: Student Progress, Course Completion, Revenue analytics.
- [x] **A6. Sprint 6 Admin & Settings APIs**:
  - System Settings API (`/api/v1/admin/settings`).
  - Audit Log viewer API (`/api/v1/admin/audit-logs`) and Web UI table with filters.
  - Database Backup/Restore endpoints (admin-guarded).

---

### Phase B: Real-Product Features & Cambodian Fintech Differentiator
- [x] **B1. Learning Experience**:
  - Resume position tracking: save video timestamp every ~10s (`PATCH /api/v1/lessons/:id/progress`).
  - Course progress calculation & visible progress rings/bars on Dashboard and MyEnrollments.
  - Video Player polish: speed toggle (0.75x, 1x, 1.25x, 1.5x, 2x), remember volume/speed in localStorage, keyboard shortcuts (Space, Arrow keys, M, F).
  - PDF Viewer: page memory, zoom, full-screen, download control.
  - Personal notes & bookmarks per lesson (timestamp-linked).
  - Next/Previous lesson navigation with auto-advance countdown.
  - Drip content unlock date badge & prerequisite requirement modal.
  - Public Certificate verification page (`/verify/:certificateNumber`) with dynamic QR code generation and LinkedIn share button.
- [x] **B2. Course Discovery & Recommendations**:
  - Course Landing page preview: syllabus breakdown, free preview player, instructor bio, ratings.
  - Course ratings & reviews: one review per enrolled student, instructor response, admin moderation.
  - Filter by Price (Free, Paid, All), Sort by Popularity, Newest, Price.
  - KHR estimated price equivalents (4,100 KHR/USD).
- [x] **B3. Cambodian Finance Hub & Literacy Tools**:
  - Embedded Interactive Financial Calculators:
    1. Loan / EMI Calculator (monthly repayment, amortization schedule, principal vs interest).
    2. Compound Interest & Savings Goal Calculator.
    3. 50/30/20 Monthly Budget Planner.
    4. USD ↔ KHR Live Currency Converter (NBC benchmark 4,100 KHR).
  - Finance Glossary with tap-to-define drawer in lessons.
  - Mandatory Educational Disclaimer ("educational content, not licensed financial advice") across courses, lessons, and certificates.
- [x] **B4. Trustworthy Payments**:
  - Idempotency key header enforcement on `/checkout`.
  - Real-time polling with countdown timer for KHQR payments + manual "I have paid" confirmation.
  - Immutable payment ledger, printable receipt preview, and refund API endpoints.
- [x] **B5. Engagement & Gamification (US-100)**:
  - Daily learning streak tracker (5-day active counter).
  - Points & Badges showcase (Fintech Pioneer, 5-Day Streak, KHQR Savvy, Model Builder, Quiz Ace, QR Certified).
- [x] **B6. Instructor & Admin Experience**:
  - Course completeness score meter before publishing (thumbnail, category, modules, lessons, pricing, quiz).
  - Admin & Instructor Analytics reports dashboard with CSV export.

---

### Phase C: UX, Design System, Accessibility & Localization
- [x] **C1. Design System & 4-State UI**:
  - Unified token palette (Emerald/Navy Fintech theme, slate neutrals, gold badges).
  - Enforce Loading (skeletons), Empty (illustration + call to action), Error (retryable), and Success (toasts) across every screen.
  - Dark mode support following system preference or manual toggle.
- [x] **C2. Onboarding & Forms Polish**:
  - User onboarding dialog: language preference (Khmer/English), experience level, financial goals.
  - Inline input validation, show/hide password toggle, password strength meter, one-click demo credentials bar.
- [x] **C3. Khmer + English Localization (US-097)**:
  - Web: `i18next` integration with complete translation files (`locales/en.json`, `locales/km.json`).
  - Mobile: ARB/intl translation bundles (prepared for Phase D).
  - Number and currency formatting according to locale (e.g., $10.00 vs 41,000 ៛).
- [x] **C4. Low-Bandwidth Optimization**:
  - Mobile data-saver toggle and bandwidth-aware rendering in ThemeContext.
  - Video stream quality fallback and offline document caching hints.

---

### Phase D: Flutter Student Mobile App Polish
- [ ] **D1. Feature Parity & API Sync**:
  - Verify and polish all 18 Flutter screens against backend contracts.
  - Integrate quiz taking with countdown and assignment submission with file picker.
  - Integrate interactive finance calculators into the mobile app drawer/tabs.
  - Integrate KHQR payment flow with scan / save QR and status polling.
- [ ] **D2. Mobile Polish**:
  - Offline banner detection, pull-to-refresh on catalog and enrollments.
  - App icons, splash screens, store metadata prep in `docs/mobile/09_MOBILE_APP_PLAN.md`.

---

### Phase E: Security, Testing, DevEx & Documentation
- [ ] **E1. Security Hardening**:
  - Strict Helmet headers, CORS policies, rate-limiting on sensitive auth/checkout routes.
  - Refresh-token reuse detection.
  - File upload validation (MIME-type check, size limit, sanitize file names).
  - OWASP Top 10 security audit documented in `docs/SECURITY.md`.
- [ ] **E2. Test Automation**:
  - Backend Vitest test suite for auth, course access, quiz scoring, grade weighting, payment state machine.
  - Target >= 70% coverage on critical business logic.
- [ ] **E3. DevEx & Deployment**:
  - Verified `docker-compose.yml` for database and app services.
  - Comprehensive seed script with realistic bilingual finance courses, demo users (Admin, Instructor, Student), quizzes, and certificates.
  - OpenAPI / Swagger documentation (`/api/docs`).
  - Comprehensive documentation: `README.md`, `docs/ADMIN_MANUAL.md`, `docs/USER_GUIDE.md`, `docs/API.md`, `docs/DEPLOYMENT.md`, `docs/PAYMENTS.md`, and `docs/DEMO_SCRIPT.md`.

---

## Execution Sequence

```
Audit & Plan (Done)
      │
      ▼
Phase A: Plan Gaps (Weighting, Rubrics, Notifications, Quiz/Assignment, Sprint 5/6 Core)
      │
      ▼
Phase B: Product Polish (Finance Calculators, Video/PDF Polish, QR Certs, KHQR Polling, Gamification)
      │
      ▼
Phase C: Design System, 4 States, i18n (Khmer + English), Onboarding
      │
      ▼
Phase D: Flutter Student App Polish (Sync with Web APIs & Calculators)
      │
      ▼
Phase E: Security, Testing, Seed Data, Docker Compose & Final Documentation
```
