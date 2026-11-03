# Sprint 3 Report — Enrollment & Assessment Module

**Sprint:** 3  
**Duration:** Weeks 5–6  
**Dates:** 2026-08-08 to 2026-08-21  
**Status:** In progress In Progress — Core APIs Implemented  
**Goal:** Build enrollment workflow and assignment/quiz functionality.

---

## Sprint Goal Achievement

| Status | Item |
|--------|------|
| Yes Implemented | Enrollment CRUD API (self-enroll, admin enroll, approve, unenroll, bulk enroll) |
| Yes Implemented | Waitlist API (join, leave, process/approve with auto-enrollment) |
| Yes Implemented | Assignment CRUD API (create, update, delete, list, detail) |
| Yes Implemented | Submission API (submit, list, grade with pass/fail calculation) |
| Yes Implemented | Quiz Taking API (start attempt, submit answers, auto-grade MCQ/TrueFalse) |
| Yes Implemented | Quiz Attempt Limit & Timer Enforcement |
| Yes Implemented | Certificate Generation API (issue, verify by number, list) |
| Yes Implemented | Enrollment Report (summary counts + recent enrollments) |
| Pending Pending | Frontend pages for Sprint 3 features |
| Pending Pending | Unit tests for enrollment, quiz grading, and assignment logic |

---

## Database Changes

### New Tables

| Table | Purpose |
|-------|---------|
| `waitlists` | Waitlist entries with approve/reject/convert workflow |
| `quiz_attempts` | Student quiz attempts with timer, score, status |
| `quiz_answers` | Individual answers per attempt with auto-grading results |
| `certificates` | Generated certificates with unique certificate numbers |

### Updated Tables

| Table | Change |
|-------|--------|
| `users` | Added relations to `waitlists`, `quizAttempts` |
| `courses` | Added relation to `waitlists`, `certificates` |
| `quizzes` | Added relation to `quizAttempts` |
| `questions` | Added relation to `quizAnswers` |
| `enrollments` | Added relation to `certificates` |

---

## API Endpoints Implemented

### Enrollment

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/enrollments/enroll` | Student | Self-enroll in a published course |
| POST | `/api/v1/enrollments` | Admin/Instructor | Admin-enroll a user |
| PATCH | `/api/v1/enrollments/:id` | Admin/Instructor | Update enrollment status/progress |
| DELETE | `/api/v1/enrollments/:id` | Student/Admin/Instructor | Unenroll (sets status to dropped) |
| GET | `/api/v1/enrollments/my-enrollments` | Student | List my enrollments with course info |
| GET | `/api/v1/enrollments` | Admin/Instructor | List all enrollments with filters |
| GET | `/api/v1/enrollments/:id` | Authenticated | Get enrollment detail |
| POST | `/api/v1/enrollments/bulk` | Admin/Instructor | Bulk enroll users from userIds array |
| GET | `/api/v1/enrollments/report/overview` | Admin/Instructor | Enrollment statistics report |

### Waitlist

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/waitlists/join` | Student | Join waitlist for a course |
| DELETE | `/api/v1/waitlists/:id` | Student | Leave waitlist |
| GET | `/api/v1/waitlists/my-waitlists` | Student | List my waitlist entries |
| GET | `/api/v1/waitlists` | Admin/Instructor | List waitlists with filters |
| PATCH | `/api/v1/waitlists/:id/process` | Admin/Instructor | Approve/reject waitlist entry |

### Assignments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/assignments` | Admin/Instructor | Create assignment |
| GET | `/api/v1/assignments` | Authenticated | List assignments |
| GET | `/api/v1/assignments/:id` | Authenticated | Get assignment detail |
| PATCH | `/api/v1/assignments/:id` | Admin/Instructor | Update assignment |
| DELETE | `/api/v1/assignments/:id` | Admin/Instructor | Delete assignment |
| POST | `/api/v1/assignments/:id/submit` | Student | Submit assignment with fileUrls |
| GET | `/api/v1/assignments/:id/submissions` | Admin/Instructor | List submissions for assignment |
| POST | `/api/v1/assignments/submissions/:id/grade` | Admin/Instructor | Grade a submission |

### Quiz Taking

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/quizzes/attempts` | Student | Start quiz attempt (checks enrollment + attempt limits) |
| POST | `/api/v1/quizzes/attempts/:attemptId/submit` | Student | Submit answers and auto-grade |
| GET | `/api/v1/quizzes/attempts/:attemptId/results` | Authenticated | Get quiz results with correct/incorrect breakdown |
| GET | `/api/v1/quizzes/my-attempts` | Student | List my quiz attempts |
| GET | `/api/v1/quizzes/:quizId/status` | Authenticated | Get attempt status and remaining attempts |

### Certificates

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/certificates/issue/:enrollmentId` | Admin/Instructor | Issue certificate for completed enrollment |
| GET | `/api/v1/certificates/:id` | Authenticated | Get certificate detail |
| GET | `/api/v1/certificates/verify/:number` | Public | Verify certificate by certificate number |
| GET | `/api/v1/certificates/my-certificates` | Student | List my certificates |

---

## Technical Deliverables

### Backend

| Component | Description |
|-----------|-------------|
| `src/controllers/enrollment.controller.ts` | Enrollment CRUD, self-enroll, bulk enroll, reporting |
| `src/controllers/waitlist.controller.ts` | Waitlist join/leave/process with auto-enrollment on approve |
| `src/controllers/assignment.controller.ts` | Assignment CRUD, submission handling, grading with grade record creation |
| `src/controllers/quizAttempt.controller.ts` | Quiz attempts, timer enforcement, auto-grading, attempt limits |
| `src/controllers/certificate.controller.ts` | Certificate issuance, verification, listing |
| `src/routes/enrollment.routes.ts` | Enrollment route definitions |
| `src/routes/waitlist.routes.ts` | Waitlist route definitions |
| `src/routes/assignment.routes.ts` | Assignment route definitions |
| `src/routes/quizAttempt.routes.ts` | Quiz attempt route definitions |
| `src/routes/certificate.routes.ts` | Certificate route definitions |
| `src/validations/enrollment.schema.ts` | Zod schemas for enrollment operations |
| `src/validations/waitlist.schema.ts` | Zod schemas for waitlist operations |
| `src/validations/assignment.schema.ts` | Zod schemas for assignment/submission/grade |
| `src/validations/quizAttempt.schema.ts` | Zod schemas for quiz attempts |
| `prisma/schema.prisma` | Extended with `Waitlist`, `QuizAttempt`, `QuizAnswer`, `Certificate` |
| `src/app.ts` | Wired new routes into Express app |

---

## Business Logic Highlights

### Enrollment Rules
- Self-enrollment only allowed on `PUBLISHED` courses
- Duplicate active enrollments are rejected
- Dropped/expired enrollments can be reactivated
- Bulk enrollment skips already-active users

### Waitlist Flow
- Students can join waitlist if not already enrolled
- Approval automatically creates an enrollment record
- Rejection keeps the waitlist entry for audit purposes

### Quiz Auto-Grading
- **MCQ** and **True/False**: Automatically graded on submission
- **Short Answer**: Left as `isCorrect: null` for manual grading
- Timer enforced: elapsed time checked on submit; auto-fails if expired
- Attempt limits: maximum attempts configurable per quiz

### Assignment Grading
- Deadline enforcement with optional late submission
- Grading creates a `Grade` record with percentage and pass/fail
- Students can resubmit (updates existing submission)

### Certificates
- Unique certificate number generated per certificate (`ELMS-{timestamp}-{random}`)
- Linked to enrollment; only issued for completed enrollments
- Public verification endpoint (no auth required)

---

## Testing Summary

| Test Type | Status | Notes |
|-----------|--------|-------|
| Type Safety (Backend) | Yes | `tsc --noEmit` passes with zero errors |
| Database Migration | Yes | Prisma migration applied successfully |
| Prisma Client Generation | Yes | Client regenerated after schema changes |

---

## Next Steps (Sprint 3 Continuation)

1. **Frontend Pages**
   - Student "Enroll Now" / "My Courses" page
   - Admin enrollment management (approve, bulk, reports)
   - Quiz taking interface with timer
   - Assignment submission form
   - Certificate download page

2. **Testing**
   - Unit tests for enrollment rules
   - Unit tests for quiz auto-grading logic
   - Unit tests for assignment deadline enforcement

3. **Documentation**
   - Update `03_API_DOCUMENTATION.md` with new endpoints
   - Update `CHANGELOG.md`

---

*Report Prepared: 2026-07-28*  
*Sprint 3 Status: In progress IN PROGRESS — Backend APIs complete, frontend pending*
