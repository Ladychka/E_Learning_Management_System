# ELMS — API Reference & Integration Guide

The ELMS API is versioned under `/api/v1` and follows RESTful architectural principles.

---

## 1. Interactive Documentation

- **Swagger UI Interactive Explorer:** `http://localhost:5000/api/docs`
- **OpenAPI 3.0 Specification (JSON):** `http://localhost:5000/api/docs/swagger.json`
- **Health Check Endpoint:** `GET http://localhost:5000/health`

---

## 2. Authentication & Authorization

All authenticated endpoints require an `Authorization` header containing a valid Bearer token:
```http
Authorization: Bearer <ACCESS_TOKEN>
```

### Auth Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Authenticate user, returns access & refresh tokens | Public (Rate limited) |
| `POST` | `/api/v1/auth/register` | Register student account | Public (Rate limited) |
| `POST` | `/api/v1/auth/refresh` | Rotate access token using valid refresh token | Public |
| `GET` | `/api/v1/auth/me` | Fetch active user profile and roles | Authenticated |
| `POST` | `/api/v1/auth/logout` | Revoke active refresh session | Authenticated |

---

## 3. Course Discovery & Curriculum

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/courses` | List published courses with filters (`search`, `categoryId`, `level`) | Public |
| `GET` | `/api/v1/courses/:id` | Course detail, syllabus, instructor info, and review aggregates | Public |
| `POST` | `/api/v1/courses` | Create new course draft | Instructor, Admin |
| `GET` | `/api/v1/courses/:id/modules` | Fetch modules and lesson hierarchy | Enrolled / Author |
| `GET` | `/api/v1/lessons/:id` | Fetch lesson content with signed video/PDF resource URLs | Enrolled / Author |

---

## 4. Payments & KHQR Gateway

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/v1/payments/checkout` | Initiate course checkout; generates KHQR data and payment ID | Student |
| `GET` | `/api/v1/payments/:id` | Check transaction status (`PENDING`, `COMPLETED`, `FAILED`) | Student, Admin |
| `POST` | `/api/v1/payments/:id/confirm` | Simulate/confirm payment transaction (Sandbox test rail) | Authenticated |
| `GET` | `/api/v1/payments/history` | List student payment history with invoice links | Student |
| `GET` | `/api/v1/payments/:id/invoice` | Generate printable receipt/invoice HTML | Student, Admin |

### Idempotency Key Support
Clients may pass an `Idempotency-Key` or `clientRequestId` header on checkout to avoid duplicate payment creation:
```http
POST /api/v1/payments/checkout
Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
```

---

## 5. Public Certificate Verification

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/certificates/verify/:certNum` | Validate certificate authenticity by code | Public |

**Response Format:**
```json
{
  "status": "success",
  "data": {
    "isValid": true,
    "certificateNumber": "CERT-2026-001",
    "studentName": "Dara Chan",
    "courseTitle": "Cambodian Digital Banking Architecture & KHQR",
    "issuedAt": "2026-10-24T12:00:00Z"
  }
}
```

---

## 6. Rate Limiting Policy

- **Global Gateway:** 50,000 requests per 15-minute window for authenticated asset streaming.
- **Authentication Routes (`/auth/login`, `/auth/register`):** Stricter limit of 100 requests per 15 minutes to mitigate brute-force password guessing.
- **Payment Checkout (`/payments/checkout`):** Stricter limit of 100 checkout calls per 15 minutes to prevent transaction spam.
