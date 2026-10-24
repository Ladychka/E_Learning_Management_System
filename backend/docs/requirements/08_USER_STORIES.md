# User Stories Reference

Complete list of all 100 user stories organized by sprint and epic. Use this document for sprint planning, backlog grooming, and progress tracking.

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ | Implemented & Tested |
| 🔄 | In Progress |
| ⏳ | Pending / Not Started |

---

## Sprint 1 — Foundation & Authentication (Weeks 1–2)

**Deliverable:** Authentication & Role Management, Basic Course Management

| ID | Story | Status | Priority | Acceptance Criteria |
|----|-------|--------|----------|---------------------|
| US-001 | As a guest, I can register an account with email and password so that I can access the platform. | ✅ | High | Form validation, unique email, password strength, confirmation email sent. |
| US-002 | As a registered user, I can log in with my credentials so that I can access my account. | ✅ | High | JWT token returned, session persisted, last login tracked. |
| US-003 | As a logged-in user, I can log out so that my session ends securely. | ✅ | High | Token revoked, all sessions invalidated. |
| US-004 | As an admin, I can manage all user accounts so that I can maintain platform integrity. | ✅ | High | List, search, filter, view, edit, delete users. |
| US-005 | As an admin, I can assign roles (Student, Instructor, Admin) so that permissions are controlled. | ✅ | High | Role assignment, route guards enforced. |
| US-006 | As a user, I can reset my password via email so that I can recover access. | ✅ | High | Secure token flow, 1-hour expiry, password updated. |
| US-007 | As a user, I can update my profile information so that my account stays current. | ✅ | Medium | Edit name, bio, contact details, preferences. |
| US-008 | As a new user, I receive an email verification link so that my email is confirmed. | ✅ | High | Token-based verification, account status updated. |
| US-009 | As a user, my session expires after a period so that security is maintained. | ✅ | High | JWT 7-day expiry, refresh token 30-day expiry. |
| US-010 | As a user, I can deactivate my account so that I can leave the platform. | ✅ | Medium | Password confirmation required, all tokens revoked. |
| US-011 | As an instructor, I can create a course so that I can publish content. | ✅ | High | Course form with title, description, pricing, category. |
| US-012 | As an instructor, I can update my course details so that information stays accurate. | ✅ | High | Edit all fields, slug regeneration, ownership check. |
| US-013 | As an instructor, I can delete my course so that I can remove unwanted content. | ✅ | High | Ownership check, audit logged, cascade cleanup. |
| US-014 | As a student, I can search and filter courses so that I can find relevant content. | ✅ | High | Text search, category/level/price filters, pagination. |
| US-015 | As an admin, I can manage course categories so that content is organized. | ✅ | High | CRUD categories, hierarchical structure, course counts. |

**Sprint 1 Total:** 15/15 stories (100%)

---

## Sprint 2 — Course & Curriculum Management (Weeks 3–4)

**Deliverable:** Course & Curriculum/Content Management Module

| ID | Story | Status | Priority | Acceptance Criteria |
|----|-------|--------|----------|---------------------|
| US-016 | As an instructor, I can upload a course thumbnail so that my course is visually appealing. | ⏳ | High | Image upload, resize, object storage, URL saved. |
| US-017 | As an instructor, I can set course pricing so that I can monetize my content. | ⏳ | High | Price, currency, free toggle, sale pricing. |
| US-018 | As an instructor, I can set course status (draft/published) so that I control visibility. | ⏳ | High | Status workflow, publish date tracking. |
| US-019 | As an instructor, I can set prerequisites so that students know requirements. | ⏳ | Medium | Text or course-based prerequisites displayed. |
| US-020 | As an instructor, I can schedule course availability so that content releases on time. | ⏳ | Medium | Start/end dates, calendar integration. |
| US-021 | As an instructor, I can add modules/sections so that content is structured. | ⏳ | High | Create, name, reorder modules under a course. |
| US-022 | As an instructor, I can add lessons so that I deliver content incrementally. | ⏳ | High | Create lessons under modules, multiple content types. |
| US-023 | As an instructor, I can upload videos so that I deliver video lessons. | ⏳ | High | Video upload, streaming, progress tracking. |
| US-024 | As an instructor, I can upload documents/PDFs so that I provide reading materials. | ⏳ | High | PDF upload, inline viewer, download option. |
| US-025 | As an instructor, I can attach quizzes to lessons so that I assess understanding. | ⏳ | Medium | Quiz builder, question creation, answer keys. |
| US-026 | As an instructor, I can reorder content so that the curriculum flows logically. | ⏳ | Medium | Drag-and-drop ordering, persist sort order. |
| US-027 | As an instructor, I can set lessons as free previews so that students can sample content. | ⏳ | Medium | Toggle preview, visible to non-enrolled. |
| US-028 | As an instructor, I can attach downloadable resources so that students get supplementary materials. | ⏳ | Medium | File attachments per lesson, download tracking. |
| US-029 | As an instructor, I can version lesson content so that I can track changes. | ⏳ | Low | Save versions, view history, rollback. |
| US-030 | As an instructor, I can drip content so that students progress sequentially. | ⏳ | Medium | Schedule unlock based on enrollment date or completion. |

**Sprint 2 Total:** 0/15 stories (0%)

---

## Sprint 3 — Enrollment, Assignments & Quizzes (Weeks 5–6)

**Deliverable:** Enrollment Module & Assessment (Assignments/Quizzes) Module

| ID | Story | Status | Priority | Acceptance Criteria |
|----|-------|--------|----------|---------------------|
| US-031 | As a student, I can self-enroll in a course so that I can start learning. | ⏳ | High | One-click enroll, immediate access. |
| US-032 | As an admin, I can enroll students manually so that I can manage registrations. | ⏳ | High | Bulk or individual admin enrollment. |
| US-033 | As an admin, I can approve enrollments so that I control access. | ⏳ | Medium | Approval workflow, pending status. |
| US-034 | As a student, I can join a waitlist so that I get notified when space opens. | ⏳ | Medium | Waitlist queue, auto-promotion on vacancy. |
| US-035 | As a student, I can unenroll so that I can leave a course. | ⏳ | Medium | Refund policy check, access revoked. |
| US-036 | As a student, I can view my enrollment history so that I track my learning. | ⏳ | Medium | Past/current enrollments list. |
| US-037 | As an admin, I can bulk enroll students so that I save time. | ⏳ | Medium | CSV upload or multi-select enrollment. |
| US-038 | As an admin, I can set enrollment expiration so that access is time-limited. | ⏳ | Medium | Expiry date, renewal reminder. |
| US-039 | As a student, I receive a certificate upon completion so that I have proof of achievement. | ⏳ | High | PDF certificate, completion criteria, download. |
| US-040 | As an admin, I can generate enrollment reports so that I track registrations. | ⏳ | Low | Filterable report, export options. |
| US-041 | As an instructor, I can create assignments so that I assess student work. | ⏳ | High | Assignment form, instructions, file attachments. |
| US-042 | As a student, I can submit assignments so that I complete coursework. | ⏳ | High | File upload, text submission, confirmation. |
| US-043 | As an instructor, I can set assignment deadlines so that submissions are on time. | ⏳ | High | Due date, late submission flag. |
| US-044 | As a student, I can upload files with my assignment so that I provide deliverables. | ⏳ | High | Multiple file upload, size/type validation. |
| US-045 | As an instructor, I can create quizzes so that I test knowledge. | ⏳ | High | Quiz builder, settings (time, attempts). |
| US-046 | As an instructor, I can use multiple question types so that I vary assessments. | ⏳ | High | MCQ, True/False, Short Answer support. |
| US-047 | As a student, I receive auto-graded results for MCQs so that I get immediate feedback. | ⏳ | High | Automatic scoring, instant result display. |
| US-048 | As a student, I can take timed quizzes so that assessment is fair. | ⏳ | High | Timer, auto-submit on expiry. |
| US-049 | As an instructor, I can limit quiz attempts so that retakes are controlled. | ⏳ | Medium | Max attempts, lockout after exhaustion. |
| US-050 | As a student, I can view my quiz results so that I understand my performance. | ⏳ | High | Score, correct answers, explanations. |

**Sprint 3 Total:** 0/20 stories (0%)

---

## Sprint 4 — Grading & Payments (Weeks 7–8)

**Deliverable:** Grading System & Digital Payment Module

| ID | Story | Status | Priority | Acceptance Criteria |
|----|-------|--------|----------|---------------------|
| US-051 | As an instructor, I can grade assignments manually so that I provide personalized evaluation. | ⏳ | High | Points, feedback, rubric-based scoring. |
| US-052 | As an instructor, I can view a gradebook so that I see all student scores. | ⏳ | High | Table view, sort, filter, export. |
| US-053 | As an instructor, I can set grade weighting so that categories have different importance. | ⏳ | Medium | Assignments 40%, quizzes 30%, final 30%, etc. |
| US-054 | As an instructor, I can create rubrics so that grading is transparent. | ⏳ | Medium | Criterion-based scoring, descriptive levels. |
| US-055 | As an instructor, I can add feedback comments so that students understand their grades. | ⏳ | High | Text feedback per assignment/quiz. |
| US-056 | As an instructor, I can export grades so that I can share records. | ⏳ | Medium | CSV/PDF export. |
| US-057 | As a student, I can appeal a grade so that I can request re-evaluation. | ⏳ | Low | Appeal form, instructor review, status tracking. |
| US-058 | As a student, I can see pass/fail status so that I know if I met criteria. | ⏳ | Medium | Threshold-based pass/fail display. |
| US-059 | As a student, I can view my GPA so that I track overall academic performance. | ⏳ | Low | Calculated across all courses. |
| US-060 | As a student, I receive notifications when grades are published so that I stay informed. | ⏳ | Medium | Email + in-app notification on grade release. |
| US-071 | As a student, I can purchase a course so that I gain access. | ⏳ | High | Checkout flow, price display, terms. |
| US-072 | As a student, I can pay via KHQR so that I use Cambodian payment methods. | ⏳ | High | KHQR API integration, QR generation. |
| US-073 | As a student, I can pay via ABA PayWay so that I use my bank account. | ⏳ | High | ABA API integration, redirect flow. |
| US-074 | As a student, I can pay via Bakong so that I use the national payment platform. | ⏳ | High | Bakong API integration, callback handling. |
| US-075 | As a student, I can choose subscription plans so that I access multiple courses. | ⏳ | Medium | Monthly/annual plans, recurring billing. |
| US-076 | As a student, I can apply coupon codes so that I get discounts. | ⏳ | Medium | Code validation, discount calculation. |
| US-077 | As a student, I receive an invoice so that I have payment proof. | ⏳ | High | PDF invoice, line items, tax. |
| US-078 | As an admin, I can process refunds so that I handle cancellations. | ⏳ | Medium | Refund form, gateway reversal, notification. |
| US-079 | As a student, I can view my payment history so that I track spending. | ⏳ | Medium | Transaction list, status, receipts. |
| US-080 | As an admin, I can manage instructor revenue sharing so that payouts are accurate. | ⏳ | Low | Revenue split calculation, payout report. |

**Sprint 4 Total:** 0/20 stories (0%)

---

## Sprint 5 — Communication & Reporting (Weeks 9–10)

**Deliverable:** Communication Module & Analytics Dashboard

| ID | Story | Status | Priority | Acceptance Criteria |
|----|-------|--------|----------|---------------------|
| US-061 | As a student, I can participate in discussion forums so that I collaborate with peers. | ⏳ | Medium | Threaded discussions, categories, search. |
| US-062 | As a student, I can comment on lessons so that I ask questions. | ⏳ | Medium | Inline comments, instructor replies. |
| US-063 | As a user, I can send direct messages so that I communicate privately. | ⏳ | Medium | Inbox, compose, read receipts. |
| US-064 | As an instructor, I can post announcements so that I broadcast updates. | ⏳ | High | Rich text, target course, notification trigger. |
| US-065 | As a user, I receive in-app notifications so that I stay updated. | ⏳ | High | Notification bell, unread count, click-to-view. |
| US-066 | As a user, I can use live chat support so that I get instant help. | ⏳ | Low | Chat widget, support agent assignment. |
| US-067 | As an instructor, I can host video conferences so that I teach live sessions. | ⏳ | Low | Zoom/Jitsi integration, scheduling, recordings. |
| US-068 | As a student, I can ask questions in a Q&A section so that I get clarifications. | ⏳ | Medium | Vote up/down, mark as answered, instructor badge. |
| US-069 | As a user, I receive email notifications so that I don't miss updates. | ⏳ | High | Triggered emails: enrollment, grade, announcement. |
| US-070 | As a user, I can view a calendar so that I track deadlines and live sessions. | ⏳ | Medium | iCal integration, event display, reminders. |
| US-081 | As an admin, I can view student progress reports so that I monitor learning. | ⏳ | High | Charts, completion rates, time spent. |
| US-082 | As an admin, I can view course completion reports so that I measure success. | ⏳ | Medium | Aggregate completion stats per course. |
| US-083 | As an admin, I can view instructor performance reports so that I evaluate quality. | ⏳ | Medium | Ratings, student feedback, revenue per instructor. |
| US-084 | As an admin, I can view revenue reports so that I track financial health. | ⏳ | High | Revenue by course, gateway, date range. |
| US-085 | As an admin, I can view enrollment analytics so that I understand demand. | ⏳ | Medium | Enrollment trends, popular courses, demographics. |
| US-086 | As an admin, I can view quiz/assignment analytics so that I assess difficulty. | ⏳ | Medium | Average scores, attempt counts, time distribution. |
| US-087 | As an admin, I can view engagement analytics so that I improve content. | ⏳ | Medium | Lesson views, time on page, drop-off points. |
| US-088 | As an admin, I can view the admin dashboard so that I have a command center. | ⏳ | High | Summary cards, charts, recent activity feed. |
| US-089 | As an admin, I can view attendance reports so that I track participation. | ⏳ | Low | Login frequency, lesson access patterns. |
| US-090 | As an admin, I can view certificate issuance reports so that I track completions. | ⏳ | Low | Certificates per course, per student, per date. |

**Sprint 5 Total:** 0/20 stories (0%)

---

## Sprint 6 — Administration, Testing & Launch (Weeks 11–12)

**Deliverable:** Administration Module, Full System Testing & Deployment

| ID | Story | Status | Priority | Acceptance Criteria |
|----|-------|--------|----------|---------------------|
| US-091 | As an admin, I can configure system settings so that the platform behaves as desired. | ⏳ | High | Key-value settings, public/private, grouped. |
| US-092 | As an admin, I can manage categories so that content taxonomy is maintained. | ✅ | High | Sprint 1 includes basic category management. |
| US-093 | As an admin, I can customize site branding so that the platform matches our identity. | ⏳ | Medium | Logo, colors, footer text, favicon. |
| US-094 | As an admin, I can backup the database so that data is protected. | ⏳ | High | Automated backups, manual trigger, download. |
| US-095 | As an admin, I can restore the database so that I recover from incidents. | ⏳ | High | Restore from backup file, validation. |
| US-096 | As an admin, I can view audit logs so that I track all system changes. | ✅ | High | Sprint 1 includes audit logging on all mutations. |
| US-097 | As a user, I can switch languages so that I use the platform comfortably. | ⏳ | Medium | i18n framework, language selector, translations. |
| US-098 | As a user, I can access the platform on mobile so that I learn anywhere. | ⏳ | Medium | Responsive design, mobile-optimized UI. |
| US-099 | As a student, I receive AI course recommendations so that I discover relevant content. | ⏳ | Low | ML model, collaborative filtering, UI display. |
| US-100 | As a student, I earn badges/points so that I stay motivated. | ⏳ | Low | Point rules, badge triggers, leaderboard. |

**Sprint 6 Total:** 2/10 stories (20% — partial from Sprint 1)

---

## Progress Summary

| Sprint | Total Stories | Completed | Percentage |
|--------|--------------|-----------|------------|
| Sprint 1 | 15 | 15 | 100% |
| Sprint 2 | 15 | 0 | 0% |
| Sprint 3 | 20 | 0 | 0% |
| Sprint 4 | 20 | 0 | 0% |
| Sprint 5 | 20 | 0 | 0% |
| Sprint 6 | 10 | 2 | 20% |
| **TOTAL** | **100** | **17** | **17%** |

---

*Document Version: 1.0*  
*Last Updated: 2026-07-24*
