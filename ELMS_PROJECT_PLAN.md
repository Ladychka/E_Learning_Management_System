# E-Learning Management System (LMS) — Project Plan


A Scrum-based build plan for an LMS supporting KHQR, ABA PayWay, and Bakong payments.  
Use this file as the working spec — check off tasks as they're completed.

## Project type

Fintech e-learning platform — courses teach finance topics via **video lessons** and **PDF materials**, and the platform processes real payments (KHQR / ABA PayWay / Bakong). This dual nature (financial-literacy content + financial transactions) means both the **content pipeline** and the **payments module** need




- **Mobile app (students):** Flutter
- **Web Admin / Instructor console:** React, consuming the same backend API
- **Backend API:** Node.js / TypeScript (Express) — *carried forward from Sprint 1–2, already built on this stack; FastAPI was considered but not chosen, so we don't have to rewrite the completed auth/course modules. Flag if this should be revisited.*
- **Database:** PostgreSQL (Prisma ORM, per Phase 0)
- **File storage:** S3-compatible object storage (n\ ot DB blobs) + CDN — hosts finance lesson videos and PDF materials
- **Auth:** JWT (access + refresh tokens) + bcrypt password hashing, per Sprint 1
- **Payments:** KHQR, ABA PayWay, Bakong (sandbox first)

## Core architecture

```
                Flutter mobile app (students)        React web admin (instructors/admin)
                            \                                 /
                             \                               /
                              v                             v
                          Backend API  <-- single point of control
                     (auth, courses, enrollment, grading, payments)
                         |                              \
                         v                               v
                     Database                      File storage (finance videos, PDFs, images)
                     (PostgreSQL)                          |
                         |                                 v
                         v                                CDN (video/PDF delivery to mobile + web)
              Payment gateways (KHQR / ABA PayWay / Bakong)
              — called only from backend, never from client apps
```

**Rules for Claude Code to follow:**
- Neither the Flutter app nor the React admin panel calls payment gateways or storage directly — always through the backend API.
- All money-related logic (checkout, refunds, payouts) lives in a dedicated `payments` module.
- Database holds relational/structured data only; large files (finance videos, PDFs) go to object storage with a reference URL stored in the DB, served via CDN.
- The Flutter app and React admin panel are two separate clients of one backend API — do not fork business logic between them; keep validation and rules server-side.
- Finance video/PDF content should support streaming/progressive download on mobile (Flutter) rather than full-file downloads where possible, given data-cost sensitivity for mobile learners.

---

## Phase 0 — Foundation (before Sprint 1) COMPLETED

- [x] Confirm requirements and scope sign-off
- [x] Finalize tech stack choice — Node.js/Express + React + PostgreSQL + Prisma
- [x] Set up repo, branching strategy (e.g. `main` / `develop` / feature branches)
- [x] Set up dev, staging, and production environments — Docker Compose for local PostgreSQL
- [x] Design database schema / ERD: users, courses, modules, lessons, enrollments, assignments, grades, payments (see `prisma/schema.prisma`)
- [x] Draft UI/UX wireframes for core screens (dashboard, course page, checkout, gradebook) — Implemented as working React pages

---

## Sprint 1 (Weeks 1–2) COMPLETED

**Goal:** Build the project foundation, authentication, and basic course management.

**User Stories**
- [x] **US-001** Register — `POST /api/v1/auth/register` with bcrypt + email verification
- [x] **US-002** Login — `POST /api/v1/auth/login` with JWT access + refresh tokens
- [x] **US-003** Logout — `POST /api/v1/auth/logout` with refresh token revocation
- [x] **US-004** User Management — Admin CRUD, search, pagination, suspend/reactivate
- [x] **US-005** Role Management — Enum roles (STUDENT / INSTRUCTOR / ADMIN) + route guards
- [x] **US-006** Reset Password — Secure token flow via email (`forgot-password` → `reset-password`)
- [x] **US-007** Update Profile — `PATCH /api/v1/auth/profile` + extended profile fields
- [x] **US-008** Email Verification — Token-based verification on registration
- [x] **US-009** Session Timeout — JWT expiry (7d) + refresh token rotation (30d)
- [x] **US-010** Deactivate Account — Self-service deactivation with password confirmation
- [x] **US-011** Create Course — `POST /api/v1/courses` (instructor/admin only)
- [x] **US-012** Update Course — `PATCH /api/v1/courses/:id` with ownership checks
- [x] **US-013** Delete Course — `DELETE /api/v1/courses/:id` with ownership checks
- [x] **US-014** Search Course — Full-text search across title, description, tags
- [x] **US-015** Course Categories — Hierarchical categories with CRUD (admin)

**Deliverable:** Authentication & Role Management, Basic Course Management

---

## Sprint 2 (Weeks 3–4)

**Goal:** Complete course management and build the curriculum/content module.

**User Stories**
- [x] **US-016** Course Thumbnail
- [x] **US-017** Course Pricing
- [x] **US-018** Course Status
- [x] **US-019** Course Prerequisites
- [x] **US-020** Course Schedule
- [x] **US-021** Add Modules/Sections
- [x] **US-022** Add Lessons
- [x] **US-023** Upload Video
- [x] **US-024** Upload Documents/PDF
- [x] **US-025** Attach Quiz to Lesson
- [x] **US-026** Reorder Content
- [x] **US-027** Content Preview
- [x] **US-028** Downloadable Resources
- [x] **US-029** Content Versioning
- [x] **US-030** Drip Content Scheduling

**Deliverable:** Course & Curriculum Management Module

---

## Sprint 3 (Weeks 5–6)

**Goal:** Enrollment workflow and assignment/quiz functionality.

**User Stories**
- [x] **US-031** Self-Enroll
- [x] **US-032** Admin Enroll
- [x] **US-033** Enrollment Approval
- [x] **US-034** Waitlist
- [x] **US-035** Unenroll
- [x] **US-036** Enrollment History
- [x] **US-037** Bulk Enroll
- [x] **US-038** Enrollment Expiration
- [x] **US-039** Certificate
- [x] **US-040** Enrollment Report
- [x] **US-041** Create Assignment
- [x] **US-042** Submit Assignment
- [x] **US-043** Assignment Deadline
- [x] **US-044** Assignment File Upload
- [x] **US-045** Create Quiz
- [x] **US-046** Quiz Question Types
- [x] **US-047** Auto-Grading MCQ
- [x] **US-048** Quiz Timer
- [x] **US-049** Quiz Attempt Limit
- [x] **US-050** Quiz Results

**Status:** Backend APIs and key frontend pages implemented (My Enrollments, Checkout, Payment History). Assignment submission and quiz taking pages still pending.

**Deliverable:** Enrollment Module & Assessment (Assignments/Quizzes) Module

---

## Sprint 4 (Weeks 7–8)

**Goal:** Grading system and digital payment integration.

**User Stories**
- [x] **US-051** Manual Grading
- [x] **US-052** Gradebook
- [ ] **US-053** Grade Weighting
- [ ] **US-054** Rubrics
- [x] **US-055** Feedback Comments
- [x] **US-056** Grade Export
- [x] **US-057** Grade Appeal
- [x] **US-058** Pass/Fail Status
- [x] **US-059** GPA Calculation
- [ ] **US-060** Grade Notifications
- [x] **US-071** Course Purchase
- [x] **US-072** KHQR Payment
- [x] **US-073** ABA PayWay
- [x] **US-074** Bakong Payment
- [x] **US-075** Subscription Plans
- [x] **US-076** Coupon/Discount Codes
- [x] **US-077** Invoice Generation
- [x] **US-078** Refund Processing
- [x] **US-079** Payment History
- [x] **US-080** Instructor Revenue Sharing

**Deliverable:** Grading System & Digital Payment Module

---

## Sprint 5 (Weeks 9–10)

**Goal:** Communication tools and reporting/analytics dashboard.

**User Stories**
- [ ] **US-061** Discussion Forum
- [ ] **US-062** Comments on Lessons
- [ ] **US-063** Direct Messaging
- [ ] **US-064** Announcements
- [ ] **US-065** Notifications
- [ ] **US-066** Live Chat Support
- [ ] **US-067** Video Conferencing Integration
- [ ] **US-068** Q&A Section
- [ ] **US-069** Email Notifications
- [ ] **US-070** Calendar/Schedule View
- [ ] **US-081** Student Progress Report
- [ ] **US-082** Course Completion Report
- [ ] **US-083** Instructor Performance Report
- [ ] **US-084** Revenue Report
- [ ] **US-085** Enrollment Analytics
- [ ] **US-086** Quiz/Assignment Analytics
- [ ] **US-087** Engagement Analytics
- [ ] **US-088** Admin Dashboard
- [ ] **US-089** Attendance Report
- [ ] **US-090** Certificate Issuance Report

**Deliverable:** Communication Module & Analytics Dashboard

---

## Sprint 6 (Weeks 11–12)

**Goal:** Administration, advanced features, testing, and project completion.

**User Stories**
- [ ] **US-091** System Settings
- [ ] **US-092** Category Management
- [ ] **US-093** Site Branding
- [ ] **US-094** Backup Database
- [ ] **US-095** Restore Database
- [ ] **US-096** Audit Log
- [ ] **US-097** Multi-language Support
- [ ] **US-098** Mobile App Access
- [ ] **US-099** AI Course Recommendation
- [ ] **US-100** Gamification (Badges/Points)

**Additional Activities**
- [ ] System Integration Testing (SIT)
- [ ] User Acceptance Testing (UAT)
- [ ] Bug Fixing
- [ ] Performance Testing
- [ ] Security Testing
- [ ] Deployment
- [ ] User Training
- [ ] Project Documentation
- [ ] Sprint Review
- [ ] Sprint Retrospective
- [ ] Final Presentation

**Deliverable:** Administration Module, Full System Testing & Deployment

---

## Mobile App Track (Flutter) — runs alongside Sprints 3–6

The original plan (Sprint 1–2) was scoped as web-only. Since Flutter mobile is now a required deliverable, it needs its own track rather than being squeezed into the existing sprints:

- [ ] Flutter project scaffold, navigation, state management choice (e.g. Riverpod/Bloc)
- [ ] Auth screens (register/login/reset password) wired to existing `/api/v1/auth/*` endpoints
- [ ] Course catalog, course detail, and video/PDF lesson viewer (student-facing)
- [ ] Enrollment + checkout flow (KHQR / ABA PayWay / Bakong) — mirrors backend `payments` module, no gateway logic on-device
- [ ] Offline/low-bandwidth handling for finance videos (progressive streaming, resume support)
- [ ] Push notifications (announcements, grades, deadlines) — once Sprint 5 notifications module exists
- [ ] App store / Play store release prep

**Suggested start:** once Sprint 3 (enrollment + assessments) stabilizes the core APIs, so the mobile app isn't built against a moving contract. Can be resourced as a parallel workstream if you have separate mobile/web developers, or slotted in after Sprint 6 if the same team builds both.

**Recommendation:** add a `09_MOBILE_APP_PLAN.md` to `elms/docs/` once you're ready to break this into full user stories (mirroring the US-XXX format already used for web).

---

## Agile Timeline Summary

| Sprint   | Weeks | Main Deliverables                                      |
|----------|-------|--------------------------------------------------------|
| Sprint 1 | 1–2   | Authentication, User Management, Basic Course Management |
| Sprint 2 | 3–4   | Course & Curriculum/Content Management                 |
| Sprint 3 | 5–6   | Enrollment & Assessment (Assignments/Quizzes)          |
| Sprint 4 | 7–8   | Grading System & Digital Payment Integration           |
| Sprint 5 | 9–10  | Communication Tools & Reporting Dashboard              |
| Sprint 6 | 11–12 | Administration, Testing, Deployment, AI Features     |
| Mobile Track | Parallel to Sprints 3–6 (or post-Sprint 6) | Flutter student app: auth, catalog, lessons, checkout |

This plan includes **100 user stories** organized into epics and distributed across **6 sprints**, making it suitable for a 12-week Agile capstone project. It provides a realistic workload for a student team while covering the full software development lifecycle from planning and implementation through testing and deployment.

---

## Non-functional requirements (ongoing, not sprint-bound)

- [ ] Define performance targets and concurrent user load
- [ ] Define uptime/SLA target
- [ ] Set up automated data backup schedule
- [ ] Rate limiting on public APIs
- [ ] Enforce HTTPS everywhere
- [ ] Encrypt payment data at rest and in transit
- [ ] Signed/expiring URLs for finance video & PDF content served via CDN (prevent unauthenticated access to paid lessons)
- [ ] Compliance check on finance-content accuracy/disclaimers (fintech education content, not licensed financial advice)
- [ ] Unit test coverage per sprint (not deferred to Sprint 6)
- [ ] Integration testing starting Sprint 3–4
- [ ] Staging → production promotion process
- [ ] Rollback plan
- [ ] API documentation
- [ ] Admin manual
- [ ] Monitoring/logging setup post-launch
- [ ] Support process post-launch
- [ ] v2 roadmap notes (mobile app, deferred AI features)

---

## Documentation Index

All project documentation is organized in `elms/docs/`:

- **`01_PROJECT_OVERVIEW.md`** — Problem statement, objectives, scope, target users, success criteria, risk assessment
- **`02_TECHNICAL_ARCHITECTURE.md`** — System architecture diagram, design principles, database ER diagram, API design, security layers, scalability
- **`03_API_DOCUMENTATION.md`** — Full endpoint reference for all implemented APIs with request/response examples
- **`04_SPRINT_1_REPORT.md`** — Sprint 1 completion report: stories delivered, technical deliverables, testing summary, metrics
- **`05_SPRINT_2_PLAN.md`** — Sprint 2 plan: user stories, technical tasks, database changes, definition of done
- **`06_DATABASE_SCHEMA.md`** — Complete table reference: columns, types, constraints, indexes, relationships
- **`07_SETUP_GUIDE.md`** — Prerequisites, installation steps, environment variables, troubleshooting
- **`08_USER_STORIES.md`** — All 100 user stories with status tracking and acceptance criteria
- **`09_MOBILE_APP_PLAN.md`** — Flutter app user stories, screens, and API contracts (to be created)
- **`CHANGELOG.md`** — Progress log and release notes

## Notes for Claude Code

- Work through sprints in order — later sprints assume earlier tables/APIs exist.
- Keep the `payments` module isolated so gateway swaps (KHQR/ABA/Bakong) don't touch course or grading logic.
- Favor small, reviewable commits per checklist item over large multi-feature commits.
- Ask for clarification if a checklist item is ambiguous rather than guessing scope.
- Update `docs/CHANGELOG.md` and relevant sprint reports when completing work.
- Backend stays Node.js/TypeScript + Express (already built in Sprint 1–2) — don't rewrite in FastAPI unless explicitly instructed.
- The Flutter app and React admin panel both consume the same backend API; keep API contracts stable and versioned (`/api/v1/...`) so mobile isn't broken by web-only changes.
- All finance video/PDF lesson content flows through object storage + CDN with signed URLs — never store or serve directly from the database or backend filesystem.
