# ELMS — E-Learning Management System

A full-stack LMS built for a 12-week Agile capstone, supporting KHQR, ABA PayWay, and Bakong payments.

## Project Structure

```
elms/
├── backend/          # Node.js / Express / TypeScript / Prisma API
├── frontend/         # React / Vite / TypeScript / Tailwind CSS
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (or Docker)
- pnpm (or npm / yarn)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL and SMTP credentials
pnpm install
npx prisma migrate dev --name init
npx prisma db seed    # creates admin/instructor/student + demo course
pnpm dev              # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
pnpm install
pnpm dev              # http://localhost:5173
```

## Default Demo Accounts (after seed)

| Role       | Email                    | Password         |
|------------|--------------------------|------------------|
| Admin      | admin@elms.edu           | Admin123!        |
| Instructor | instructor@elms.edu      | Instructor123!   |
| Student    | student@elms.edu         | Student123!      |

## Sprint 1 Status

- [x] Register / Login / Logout (JWT + refresh tokens)
- [x] Role-based access control (Student / Instructor / Admin)
- [x] Email verification
- [x] Password reset
- [x] Profile update + password change + account deactivation
- [x] Admin user management (list, search, suspend, reactivate, delete)
- [x] Course CRUD + search + categories
- [x] Audit logging on all mutations
- [x] Frontend auth context + protected routes
- [x] Admin dashboard pages (users, courses, categories)

## API Documentation

Base URL: `http://localhost:5000/api/v1`

| Endpoint              | Method | Auth | Role         |
|-----------------------|--------|------|--------------|
| `/auth/register`      | POST   | No   | —            |
| `/auth/login`         | POST   | No   | —            |
| `/auth/logout`        | POST   | Yes  | —            |
| `/auth/me`            | GET    | Yes  | —            |
| `/auth/profile`       | PATCH  | Yes  | —            |
| `/auth/refresh`       | POST   | No   | —            |
| `/auth/verify-email`  | GET    | No   | —            |
| `/auth/forgot-password`| POST  | No   | —            |
| `/auth/reset-password`| POST   | No   | —            |
| `/users`              | GET    | Yes  | ADMIN        |
| `/users/:id`          | GET    | Yes  | ADMIN        |
| `/users`              | POST   | Yes  | ADMIN        |
| `/users/:id`          | PATCH  | Yes  | ADMIN        |
| `/users/:id`          | DELETE | Yes  | ADMIN        |
| `/users/:id/suspend`  | POST   | Yes  | ADMIN        |
| `/users/:id/reactivate`| POST  | Yes  | ADMIN        |
| `/courses`            | GET    | No*  | —            |
| `/courses/:id`        | GET    | No*  | —            |
| `/courses`            | POST   | Yes  | INSTRUCTOR/ADMIN |
| `/courses/:id`        | PATCH  | Yes  | INSTRUCTOR/ADMIN |
| `/courses/:id`        | DELETE | Yes  | INSTRUCTOR/ADMIN |
| `/categories`         | GET    | No   | —            |
| `/categories`         | POST   | Yes  | ADMIN        |
| `/categories/:id`       | PATCH  | Yes  | ADMIN        |
| `/categories/:id`       | DELETE | Yes  | ADMIN        |

\* Students see only published courses; instructors see their own + published.

## Development Notes

- **Backend rules:** Payment gateway calls happen only from backend. Frontend never touches KHQR/ABA/Bakong directly.
- **File storage:** Large files (videos, PDFs) go to S3-compatible object storage; DB stores only reference URLs.
- **Security:** Helmet, CORS, rate limiting, bcrypt (12 rounds), JWT access + refresh tokens, audit logs.
- **Testing:** Add `vitest` tests per sprint. Run with `pnpm test`.

## Documentation

Full project documentation is available in the `docs/` folder:

| Document | Contents |
|----------|----------|
| `docs/01_PROJECT_OVERVIEW.md` | Executive summary, scope, objectives, risk assessment |
| `docs/02_TECHNICAL_ARCHITECTURE.md` | System diagrams, security, scalability, module dependencies |
| `docs/03_API_DOCUMENTATION.md` | Complete endpoint reference with request/response examples |
| `docs/04_SPRINT_1_REPORT.md` | Sprint 1 completion report with metrics and testing summary |
| `docs/05_SPRINT_2_PLAN.md` | Sprint 2 breakdown: tasks, estimates, risks, acceptance criteria |
| `docs/06_DATABASE_SCHEMA.md` | Full table documentation, column reference, ERD |
| `docs/07_SETUP_GUIDE.md` | Installation, configuration, troubleshooting |
| `docs/08_USER_STORIES.md` | All 100 user stories organized by sprint with status |
| `docs/CHANGELOG.md` | Progress tracking and release notes |

## Roadmap

See `ELMS_PROJECT_PLAN.md` for the full 6-sprint plan (Sprint 1 → Sprint 6).
