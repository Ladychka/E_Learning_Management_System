# Sprint 2 Plan — Course & Curriculum Management

**Sprint:** 2  
**Duration:** Weeks 3–4  
**Dates:** 2026-07-25 to 2026-08-07  
**Goal:** Complete course management and build the curriculum/content module

---

## Sprint Objective

Extend Sprint 1's course foundation by building the content pipeline: instructors create modules and lessons, upload videos and documents, arrange content with drag-and-drop ordering, set up drip scheduling, and preview content before publishing. All content storage uses S3-compatible object storage — not database blobs.

---

## User Stories

### Content Structure

| ID | User Story | Story Points | Priority | Acceptance Criteria |
|----|-----------|-------------|----------|---------------------|
| US-016 | Course Thumbnail | 3 | High | Instructor can upload/generate thumbnail. Stored in object storage. URL saved in course table. |
| US-017 | Course Pricing | 2 | High | Price, currency, isFree fields already exist; enhance with price tiers and sale pricing. |
| US-018 | Course Status | 2 | High | Draft → Published → Archived workflow with publish date tracking. |
| US-019 | Course Prerequisites | 3 | Medium | Specify prerequisite courses or skills; validated at enrollment time. |
| US-020 | Course Schedule | 3 | Medium | Set course start/end dates; drip content availability tied to schedule. |
| US-021 | Add Modules/Sections | 5 | High | Create named modules under a course; drag-and-drop reordering. |
| US-022 | Add Lessons | 5 | High | Create lessons under modules; support video, PDF, text, quiz types. |
| US-023 | Upload Video | 8 | High | Upload video files to object storage; generate streaming URLs; track duration. |
| US-024 | Upload Documents/PDF | 5 | High | Upload PDFs and documents; display inline or as downloads. |
| US-025 | Attach Quiz to Lesson | 5 | Medium | Create quiz structure (questions, answers, correct choice) attached to a lesson. |
| US-026 | Reorder Content | 5 | Medium | Drag-and-drop to reorder modules and lessons; persist sortOrder in database. |
| US-027 | Content Preview | 3 | Medium | Mark specific lessons as "free preview" visible to non-enrolled users. |
| US-028 | Downloadable Resources | 3 | Medium | Attach supplementary files (worksheets, source code) to lessons. |
| US-029 | Content Versioning | 5 | Low | Track lesson content versions; allow rollback to previous version. |
| US-030 | Drip Content Scheduling | 5 | Medium | Schedule lesson availability based on enrollment date (e.g., unlock after 3 days). |

**Total Story Points:** 55

---

## Technical Tasks

### Backend

| Task | Est. Hours | Owner |
|------|-----------|-------|
| Module CRUD API (`POST/GET/PATCH/DELETE /courses/:id/modules`) | 4 | Backend Lead |
| Lesson CRUD API with content type enum | 6 | Backend Lead |
| File upload endpoint with multer/S3 integration | 8 | Backend Lead |
| Video streaming endpoint (range request support) | 4 | Backend Dev |
| Content reordering endpoint (bulk update sortOrder) | 4 | Backend Dev |
| Drip content scheduler (calculate availability based on enrollment date) | 6 | Backend Dev |
| Quiz structure tables and CRUD (questions, options, correct answers) | 6 | Backend Dev |
| Content versioning logic (snapshot lesson content on update) | 6 | Backend Dev |
| Update Prisma schema if needed | 2 | Backend Lead |
| Unit tests for new endpoints | 6 | QA/Dev |

### Frontend

| Task | Est. Hours | Owner |
|------|-----------|-------|
| Module/Lesson builder UI (nested tree view) | 8 | Frontend Lead |
| Drag-and-drop reordering (react-beautiful-dnd or similar) | 6 | Frontend Lead |
| Video upload component with progress bar | 6 | Frontend Dev |
| PDF viewer / document preview component | 4 | Frontend Dev |
| Lesson editor (WYSIWYG text + file attachments) | 6 | Frontend Dev |
| Quiz builder form (question types: MCQ, T/F, short answer) | 6 | Frontend Dev |
| Course settings page (thumbnail, pricing, schedule, prerequisites) | 6 | Frontend Dev |
| Drip scheduling UI (date pickers per lesson) | 4 | Frontend Dev |
| Content preview toggle (mark lesson as free preview) | 2 | Frontend Dev |

### DevOps / Infrastructure

| Task | Est. Hours | Owner |
|------|-----------|-------|
| Set up S3-compatible storage (MinIO for local dev, AWS S3 for prod) | 4 | DevOps |
| Configure CDN or signed URL generation for video delivery | 4 | DevOps |
| Add file size limits and type validation | 2 | Backend Dev |

---

## Database Changes (Planned)

### No Breaking Changes to Sprint 1 Tables
The Sprint 1 schema already includes `modules` and `lessons` tables. Sprint 2 may add:

**New Tables:**
```prisma
model LessonVersion {
  id        String   @id @default(uuid())
  lessonId  String   @map("lesson_id")
  content   String   // snapshot of content at this version
  version   Int
  createdBy String   @map("created_by")
  createdAt DateTime @default(now()) @map("created_at")

  lesson Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  @@map("lesson_versions")
}

model Quiz {
  id          String   @id @default(uuid())
  lessonId    String   @unique @map("lesson_id")
  title       String
  description String?
  timeLimit   Int?     @map("time_limit") // minutes
  maxAttempts Int?     @map("max_attempts")
  passingScore Int?    @map("passing_score")
  isPublished Boolean  @default(false) @map("is_published")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  lesson    Lesson     @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  questions Question[]

  @@map("quizzes")
}

model Question {
  id       String @id @default(uuid())
  quizId   String @map("quiz_id")
  type     String // MCQ, TRUE_FALSE, SHORT_ANSWER
  question String
  options  Json?  // array of strings for MCQ
  correctAnswer String? @map("correct_answer")
  points   Int    @default(1)
  sortOrder Int   @default(0) @map("sort_order")

  quiz Quiz @relation(fields: [quizId], references: [id], onDelete: Cascade)

  @@map("questions")
}
```

**Alterations:**
- Add `version` column to `lessons` (default: 1)
- Add `dripDays` to `lessons` (unlock after N days from enrollment)

---

## Definition of Done

- [x] All user stories implemented and manually tested
- [x] File upload works for videos >100MB with progress tracking
- [x] Video streaming supports HTTP range requests (seek/scrub)
- [x] Content reordering persists after page refresh
- [x] Free preview lessons visible to non-logged-in users
- [x] Quiz structure can be created and saved; auto-grading deferred to Sprint 3
- [x] All new endpoints have Zod validation
- [x] Audit logs capture all content mutations
- [x] Frontend UI is responsive on tablet and desktop
- [ ] Unit test coverage for file upload and module/lesson CRUD (deferred to Sprint 3)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large video uploads timeout | High | Chunked upload or resumable upload ( tus protocol ) |
| S3 costs in development | Low | Use MinIO locally; only use S3 in staging/production |
| Drag-and-drop complexity | Medium | Use established library (dnd-kit or react-beautiful-dnd) |
| Video encoding formats | Medium | Restrict to MP4/H.264; handle client-side or use a service |
| Drip scheduling accuracy | Medium | Calculate availability server-side; don't rely on client clocks |

---

## Dependencies

- **Sprint 1 tables must exist** (courses, users, categories) — ✅ Complete
- **Object storage must be configured** — Required by US-023, US-024
- **Frontend auth context** — ✅ Complete; no changes needed

---

## Sprint 2 Deliverable

**Course & Curriculum Management Module**

A working content pipeline where instructors can:
1. Create a course with thumbnail, pricing, and schedule
2. Build modules and lessons with drag-and-drop ordering
3. Upload videos and PDFs to object storage
4. Mark lessons as free previews
5. Attach quiz structures to lessons
6. Set drip content schedules

---

*Plan Prepared: 2026-07-24*  
*Status: Ready for Development*
