# Sprint 3 Plan — Enrollment & Assessment Module

**Sprint:** 3  
**Duration:** Weeks 5–6  
**Dates:** 2026-08-08 to 2026-08-21  
**Goal:** Build enrollment workflow and assignment/quiz functionality.

---

## Sprint Backlog

### Enrollment (10 user stories)

| ID | User Story | Points | Priority | Owner |
|----|-----------|--------|----------|-------|
| US-031 | Self-Enroll | 3 | High | TBD |
| US-032 | Admin Enroll | 3 | High | TBD |
| US-033 | Enrollment Approval | 3 | Medium | TBD |
| US-034 | Waitlist | 5 | Medium | TBD |
| US-035 | Unenroll | 2 | High | TBD |
| US-036 | Enrollment History | 3 | Medium | TBD |
| US-037 | Bulk Enroll | 5 | Low | TBD |
| US-038 | Enrollment Expiration | 3 | Medium | TBD |
| US-039 | Certificate | 5 | Medium | TBD |
| US-040 | Enrollment Report | 3 | Low | TBD |

### Assignments (4 user stories)

| ID | User Story | Points | Priority | Owner |
|----|-----------|--------|----------|-------|
| US-041 | Create Assignment | 5 | High | TBD |
| US-042 | Submit Assignment | 5 | High | TBD |
| US-043 | Assignment Deadline | 3 | High | TBD |
| US-044 | Assignment File Upload | 3 | High | TBD |

### Quizzes (6 user stories)

| ID | User Story | Points | Priority | Owner |
|----|-----------|--------|----------|-------|
| US-045 | Create Quiz | 3 | High | TBD |
| US-046 | Quiz Question Types | 3 | High | TBD |
| US-047 | Auto-Grading MCQ | 5 | High | TBD |
| US-048 | Quiz Timer | 3 | High | TBD |
| US-049 | Quiz Attempt Limit | 3 | High | TBD |
| US-050 | Quiz Results | 3 | High | TBD |

**Total Stories:** 20  
**Estimated Points:** 72

---

## Technical Tasks

### Database

| Task | Description | Estimated Hours |
|------|-------------|-----------------|
| DB-01 | Create `enrollments` table: id, userId, courseId, status, enrolledAt, expiresAt, approvedBy | 2 |
| DB-02 | Create `waitlists` table: id, userId, courseId, requestedAt, status | 1 |
| DB-03 | Create `assignments` table: id, lessonId, title, description, dueDate, maxPoints, attachments | 2 |
| DB-04 | Create `submissions` table: id, assignmentId, userId, content, fileUrl, submittedAt, grade, feedback | 2 |
| DB-05 | Create `quiz_attempts` table: id, quizId, userId, startedAt, submittedAt, score, status | 2 |
| DB-06 | Create `quiz_answers` table: id, attemptId, questionId, answer, isCorrect, pointsEarned | 2 |
| DB-07 | Create `certificates` table: id, userId, courseId, issuedAt, certificateNumber, templateUrl | 2 |
| DB-08 | Add enrollment relations to Prisma schema and generate migration | 1 |
| DB-09 | Add assignment/submission relations to Prisma schema and generate migration | 1 |
| DB-10 | Add quiz attempt relations to Prisma schema and generate migration | 1 |

### Backend API

| Task | Description | Estimated Hours |
|------|-------------|-----------------|
| API-01 | `POST /api/v1/courses/:id/enroll` — self-enroll with validation | 3 |
| API-02 | `POST /api/v1/enrollments` — admin create enrollment | 2 |
| API-03 | `PATCH /api/v1/enrollments/:id/approve` — approve/reject enrollment | 2 |
| API-04 | `POST /api/v1/courses/:id/waitlist` — join waitlist | 2 |
| API-05 | `DELETE /api/v1/enrollments/:id` — unenroll with rules | 2 |
| API-06 | `GET /api/v1/users/me/enrollments` — enrollment history | 2 |
| API-07 | `POST /api/v1/enrollments/bulk` — bulk enroll from CSV | 4 |
| API-08 | `GET /api/v1/courses/:id/enrollments/report` — enrollment report | 3 |
| API-09 | `POST /api/v1/lessons/:id/assignments` — create assignment | 3 |
| API-10 | `POST /api/v1/assignments/:id/submit` — submit assignment | 3 |
| API-11 | `GET /api/v1/assignments/:id/submissions` — list submissions | 2 |
| API-12 | `POST /api/v1/quizzes/:id/attempts` — start quiz attempt | 3 |
| API-13 | `POST /api/v1/quiz-attempts/:id/submit` — submit answers and auto-grade | 5 |
| API-14 | `GET /api/v1/quiz-attempts/:id/results` — get quiz results | 2 |
| API-15 | `POST /api/v1/enrollments/:id/certificate` — generate certificate | 3 |

### Frontend

| Task | Description | Estimated Hours |
|------|-------------|-----------------|
| UI-01 | Student "Enroll Now" button with modal confirmation | 3 |
| UI-02 | Admin enrollment management page (approve/reject/bulk) | 5 |
| UI-03 | Student "My Courses" / enrollment history page | 4 |
| UI-04 | Instructor assignment creation form | 4 |
| UI-05 | Student assignment submission form with file upload | 4 |
| UI-06 | Quiz taking interface with timer and progress | 6 |
| UI-07 | Quiz results page with score breakdown | 3 |
| UI-08 | Certificate download/view page | 3 |

### Business Logic

| Task | Description | Estimated Hours |
|------|-------------|-----------------|
| BL-01 | Enrollment rules: max students, prerequisites, course status | 3 |
| BL-02 | Auto-grading engine for MCQ and True/False questions | 4 |
| BL-03 | Quiz timer logic with auto-submit on expiry | 3 |
| BL-04 | Attempt limit enforcement | 2 |
| BL-05 | Certificate generation (PDF) with certificate number | 4 |
| BL-06 | Enrollment expiration logic and cron job | 3 |

---

## Definition of Done

- [ ] All database migrations applied and Prisma client regenerated
- [ ] All API endpoints return correct status codes and validated responses
- [ ] Frontend pages integrated with backend and tested manually
- [ ] Auto-grading produces correct scores for MCQ/True/False
- [ ] Quiz timer auto-submits when time expires
- [ ] Attempt limits enforced (e.g., max 3 attempts)
- [ ] Enrollment rules prevent invalid enrollments (full course, missing prerequisites)
- [ ] Unit tests written for enrollment and quiz grading logic
- [ ] API documentation updated with new endpoints
- [ ] CHANGELOG.md updated

---

## Dependencies

| Depends On | From Sprint | Impact if Missing |
|------------|-------------|-------------------|
| Course publishing workflow | Sprint 2 | Enrollment only possible on published courses |
| Quiz structure (questions table) | Sprint 2 | Attempt and grading need existing quiz data |
| Auth/role system | Sprint 1 | Enrollment checks require authenticated users |
| File upload infrastructure | Sprint 2 | Assignment submissions need file uploads |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Certificate PDF generation complex | Medium | Medium | Use `pdf-lib` or `puppeteer`; start with simple template |
| Quiz timer sync issues | Medium | High | Timer driven by backend `startedAt`; frontend is display only |
| Bulk enrollment CSV parsing edge cases | Low | Low | Validate CSV headers and row counts; reject malformed files |
| Auto-grading performance with many attempts | Low | Medium | Grade on submission, not on read; index `quiz_attempts.quizId` |

---

## Sprint Schedule

| Week | Focus |
|------|-------|
| Week 5 (Aug 8–14) | Database schema, enrollment APIs, assignment APIs |
| Week 6 (Aug 15–21) | Quiz attempt/grading, frontend pages, testing, documentation |

---

*Plan Prepared: 2026-07-28*  
*Sprint 3 Status: In progress PLANNED — Ready for development*
