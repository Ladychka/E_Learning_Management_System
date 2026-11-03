# Sprint 5 Implementation Plan — Communication Module & Analytics Dashboard

## Context

Sprint 4 (Grading & Payments) is effectively complete in code — Grade Weighting, Rubrics, and Grade Notifications are all implemented but were left unchecked in the plan. Sprint 5 is the next untouched sprint.

Sprint 5 has 20 user stories. For a realistic 2-week implementation window, we will prioritize **8 high-value stories** that are achievable with the existing stack, and defer complex integrations (WebSocket live chat, video conferencing, direct messaging) to a future phase.

---

## Sprint 5 Scope (8 User Stories)

### Communication Module

| US | Story | Status | Approach |
|----|-------|--------|----------|
| US-062 | Comments on Lessons | New | Threaded comments under each lesson, with author info and timestamps |
| US-064 | Announcements | New | Admin/instructor posts announcements (course-specific or global) |
| US-065 | Notifications (frontend) | In progress Partial | Backend exists (`notification.controller.ts`). Build the bell icon + dropdown + polling |
| US-068 | Q&A Section | New | Structured Q&A on lessons (question/answer format, marked as answered) |

### Analytics Dashboard

| US | Story | Status | Approach |
|----|-------|--------|----------|
| US-081 | Student Progress Report | New | Compute enrollment progress, completion %, time spent per course |
| US-084 | Revenue Report | New | Aggregate payment data by course, gateway, date range |
| US-085 | Enrollment Analytics | New | Enrollment trends, completion rates, drop-off points |
| US-088 | Admin Dashboard | New | Replace placeholder Dashboard with real stats widgets |

**Deferred to later:** Discussion Forum (US-061), Direct Messaging (US-063), Live Chat (US-066), Video Conferencing (US-067), Email Notifications (US-069), Calendar (US-070), Instructor Performance (US-083), Quiz/Assignment Analytics (US-086), Engagement Analytics (US-087), Attendance Report (US-089), Certificate Issuance Report (US-090).

---

## Implementation Phases

### Phase 1: Database Schema (Prisma)

Add 3 new models to `prisma/schema.prisma`:

1. **Comment** — threaded comments on lessons
   ```
   id, userId, lessonId, content, parentId (nullable, for replies), createdAt, updatedAt
   ```

2. **Announcement** — admin/instructor announcements
   ```
   id, title, content, courseId (nullable = global), createdBy, isActive, priority, createdAt, updatedAt
   ```

3. **AnnouncementRead** — track which users have read announcements
   ```
   id, announcementId, userId, readAt
   ```

After schema update: run `npx prisma migrate dev --name sprint5_communication`

### Phase 2: Backend APIs

**2A. Comment Module**
- `GET /api/v1/lessons/:lessonId/comments` — list comments with nested replies
- `POST /api/v1/lessons/:lessonId/comments` — create comment (triggers notification to lesson instructor)
- `PATCH /api/v1/comments/:id` — update own comment
- `DELETE /api/v1/comments/:id` — delete own comment (or admin/instructor)

**2B. Announcement Module**
- `GET /api/v1/announcements` — list active announcements for current user (global + enrolled courses)
- `GET /api/v1/announcements/:id` — get single announcement
- `POST /api/v1/announcements` — create announcement (admin/instructor only)
- `PATCH /api/v1/announcements/:id` — update announcement
- `DELETE /api/v1/announcements/:id` — delete announcement
- `POST /api/v1/announcements/:id/read` — mark as read
- `GET /api/v1/announcements/unread-count` — unread count for current user

**2C. Analytics Module**
- `GET /api/v1/analytics/dashboard` — admin dashboard stats (total users, enrollments, revenue, courses)
- `GET /api/v1/analytics/revenue` — revenue report with filters (date range, course, gateway)
- `GET /api/v1/analytics/enrollments` — enrollment trends (daily/weekly/monthly)
- `GET /api/v1/analytics/student-progress` — per-student course progress (for instructors)
- `GET /api/v1/analytics/course/:courseId/overview` — single course analytics

**2D. Notification Integration**
- When a comment is posted on a lesson, notify the course instructor
- When an announcement is created, notify all affected users (create Notification rows)
- Frontend polls `GET /api/v1/notifications/unread-count` every 30 seconds

### Phase 3: Frontend

**3A. Notification Bell (Layout.tsx)**
- Add bell icon with unread badge to header
- Dropdown panel showing recent notifications
- Mark as read / mark all as read buttons
- Poll every 30s for unread count

**3B. Comments Component**
- Add `<LessonComments lessonId={id} />` to `LessonPlayer.tsx`
- Threaded comment UI with avatar, name, timestamp
- Reply form, edit/delete for own comments
- Real-time feel (optimistic update on post)

**3C. Q&A Component**
- Similar to comments but with "Mark as Answer" capability
- Instructors can mark a reply as the official answer
- Q&A tab in LessonPlayer alongside Comments

**3D. Announcements Page**
- `/announcements` route — list all active announcements
- Sidebar showing read/unread status
- Admin/Instructor can create/edit announcements

**3E. Analytics Dashboard**
- Replace placeholder `Dashboard.tsx` with real data
- Role-aware widgets:
  - **Admin:** Total users, courses, revenue chart, enrollment chart, recent enrollments
  - **Instructor:** My courses, total students, revenue from my courses, recent submissions
  - **Student:** My courses, progress bars, upcoming deadlines, recent grades

**3F. Revenue Report Page**
- `/admin/revenue` — date range picker, bar chart by gateway, table of transactions

**3G. Enrollment Analytics Page**
- `/admin/enrollments/analytics` — line chart of enrollments over time, completion funnel

### Phase 4: Wiring & Integration

- Register all new routes in `app.ts`
- Add API helpers in `frontend/src/lib/api.ts`
- Add routes in `frontend/src/App.tsx`
- Ensure role-based access control on all new endpoints

---

## Files to Create/Modify

### Backend
| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add Comment, Announcement, AnnouncementRead models |
| `src/controllers/comment.controller.ts` | Create |
| `src/controllers/announcement.controller.ts` | Create |
| `src/controllers/analytics.controller.ts` | Create |
| `src/routes/comment.routes.ts` | Create |
| `src/routes/announcement.routes.ts` | Create |
| `src/routes/analytics.routes.ts` | Create |
| `src/validations/comment.schema.ts` | Create |
| `src/validations/announcement.schema.ts` | Create |
| `src/app.ts` | Register new routers |
| `src/utils/email.ts` | Add announcement email template (optional) |

### Frontend
| File | Action |
|------|--------|
| `src/lib/api.ts` | Add commentApi, announcementApi, analyticsApi |
| `src/App.tsx` | Add new routes |
| `src/components/Layout.tsx` | Add notification bell |
| `src/components/NotificationBell.tsx` | Create |
| `src/components/LessonComments.tsx` | Create |
| `src/components/LessonQnA.tsx` | Create |
| `src/pages/Dashboard.tsx` | Replace placeholder with real analytics |
| `src/pages/Announcements.tsx` | Create |
| `src/pages/Admin/Revenue.tsx` | Create |
| `src/pages/Admin/EnrollmentAnalytics.tsx` | Create |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Too many features for one sprint | Scope is already narrowed to 8 stories; defer rest |
| Comment threading complexity | Limit to 1 level of nesting (reply to comment, not reply to reply) |
| Analytics queries slow on large data | Use Prisma `count` + `groupBy`, add indexes if needed |
| Notification polling is inefficient | Acceptable for MVP; WebSocket can be Sprint 6 enhancement |
| Chart library choice | Use lightweight `recharts` (already in React ecosystem) |

---

## Definition of Done

- [ ] All new backend routes respond correctly with Postman/curl tests
- [ ] Frontend pages render without errors and show real data
- [ ] Role-based access control enforced on all new endpoints
- [ ] Comments and Q&A visible on LessonPlayer page
- [ ] Notification bell shows unread count and recent items
- [ ] Dashboard shows real stats (not "0" placeholders)
- [ ] No TypeScript errors in new code
- [ ] Prisma migration applied and documented
