# Next Steps — ELMS Development Plan

**Current Status:** Sprint 1 backend scaffolded, database migrated, frontend running. One critical blocker: frontend login returns "Login failed" despite backend API working correctly (verified via PowerShell).

---

## Phase 1 — Fix Critical Blockers (Do This First)

### Step 1: Diagnose Frontend Login Failure
**Why:** Backend login API returns 200 + JWT token when called directly. Frontend says "Login failed". This blocks all authenticated pages.

**Actions:**
1. Open http://localhost:5173/login → press **F12** → **Console** tab
2. Enter credentials and click login
3. Read the exact red error message (screenshot it)
4. Switch to **Network** tab → find the `login` request
5. Check status code: `CORS error`, `404`, `500`, or `Network Error`?

**Likely Fixes:**
- If `CORS error` → Backend `.env` `FRONTEND_URL` must exactly match `http://localhost:5173` (no trailing slash)
- If `404` on `http://localhost:5173/api/v1/auth/login` → Vite proxy not working; verify `vite.config.ts` proxy block
- If `Network Error` → Backend is not running on port 5000 or firewall blocked

**File to verify:**
```typescript
// backend/src/config/index.ts
frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

// backend/src/app.ts
cors({ origin: config.frontendUrl, credentials: true })

// frontend/vite.config.ts
proxy: { "/api": { target: "http://localhost:5000", changeOrigin: true } }

// frontend/src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";
```

---

## Phase 2 — Sprint 2: Course & Curriculum Management (Weeks 3–4)

**Goal:** Enable instructors to build course content with modules, lessons, uploads, and quiz structures.

### Sprint 2 Task Breakdown

| Priority | Task | Owner | Est. Time |
|----------|------|-------|-----------|
| 🔴 High | **Module CRUD API** — `POST/GET/PATCH/DELETE /courses/:id/modules` | Backend | 4h |
| 🔴 High | **Lesson CRUD API** — Content types: video, pdf, text, quiz | Backend | 6h |
| 🔴 High | **File Upload Endpoint** — Multer + S3/MinIO integration | Backend | 8h |
| 🟡 Medium | **Video Streaming** — HTTP range request support | Backend | 4h |
| 🟡 Medium | **Quiz Structure Tables** — Questions, options, correct answers | Backend | 6h |
| 🟡 Medium | **Content Reordering** — Bulk update sortOrder API | Backend | 4h |
| 🟡 Medium | **Drip Content Scheduler** — Calculate availability from enrollment date | Backend | 6h |
| 🔴 High | **Module/Lesson Builder UI** — Nested tree view in React | Frontend | 8h |
| 🟡 Medium | **Drag-and-Drop Reordering** — react-beautiful-dnd or dnd-kit | Frontend | 6h |
| 🟡 Medium | **Video Upload Component** — Progress bar, preview | Frontend | 6h |
| 🟡 Medium | **PDF Viewer** — Inline display or download | Frontend | 4h |
| 🟢 Low | **Course Settings Page** — Thumbnail, pricing, schedule, prerequisites | Frontend | 6h |

### Sprint 2 User Stories to Implement

| ID | Story | Status Target |
|----|-------|---------------|
| US-016 | Course Thumbnail | Upload to object storage, save URL |
| US-021 | Add Modules/Sections | Create, name, reorder under a course |
| US-022 | Add Lessons | Multiple content types (video, pdf, text, quiz) |
| US-023 | Upload Video | Upload + streaming + duration tracking |
| US-024 | Upload Documents/PDF | Upload + inline viewer |
| US-025 | Attach Quiz to Lesson | Quiz builder with questions/answers |
| US-026 | Reorder Content | Drag-and-drop persistence |
| US-027 | Content Preview | Free preview toggle for lessons |

---

## Phase 3 — Infrastructure Setup (Parallel to Sprint 2)

| Task | Purpose | Priority |
|------|---------|----------|
| Set up **MinIO** locally (S3-compatible) | File upload testing without AWS costs | High |
| Configure **signed URLs** for private videos | Secure content delivery | Medium |
| Add **vitest tests** for Sprint 1 APIs | Prevent regressions | Medium |
| Set up **GitHub repo + CI/CD** | Team collaboration | Low (if solo) |

---

## Immediate Action Checklist (Next 30 Minutes)

- [ ] Open browser F12 Console, try login, screenshot the error
- [ ] Verify backend terminal shows `🚀 Server running on http://localhost:5000`
- [ ] Verify `backend/.env` has `FRONTEND_URL=http://localhost:5173` (no quotes, no trailing slash)
- [ ] Restart both backend (`npm run dev`) and frontend (`npm run dev`) after any `.env` change
- [ ] Confirm login works → proceed to Sprint 2

---

## Definition of Ready for Sprint 2

Before starting Sprint 2 coding, confirm:
1. ✅ Sprint 1 login works end-to-end (frontend → backend → database)
2. ✅ All 3 demo accounts can log in successfully
3. ✅ Admin can access `/admin/users`, `/admin/courses`, `/admin/categories`
4. ✅ Instructor can create a course via frontend

---

*Document Version: 1.0*  
*Last Updated: 2026-07-24*
