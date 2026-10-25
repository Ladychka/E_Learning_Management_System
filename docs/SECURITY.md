# ELMS — OWASP Top 10 Security Audit & Hardening Report

This document details the security safeguards implemented in the ELMS architecture against the OWASP Top 10 application security vulnerabilities.

---

## 1. Injection (A03:2021)
- **Database Access:** 100% of database queries utilize **Prisma ORM**, which enforces parameterized SQL queries, completely eliminating SQL injection vectors.
- **Input Validation:** Every mutating endpoint (`POST`, `PATCH`, `PUT`) is protected by **Zod validation schemas** that reject malformed parameters before reaching controller handlers.

---

## 2. Broken Authentication & Session Hijacking (A07:2021)
- **Password Storage:** Hashed using **bcrypt** with a minimum of 10 salt rounds (verified in automated unit tests).
- **Token Architecture:** Dual JWT tokens:
  - Short-lived Access Token (15 minutes).
  - Long-lived Refresh Token (7 days) stored securely with token rotation.
- **Brute Force Protection:** Dedicated `express-rate-limit` limiter on `/api/v1/auth/login` and `/api/v1/auth/register` (100 attempts per 15 minutes).

---

## 3. Cryptographic Failures & Data Exposure (A02:2021)
- **Secrets Management:** Secrets and keys (`JWT_SECRET`, database passwords) are loaded via environment variables (`.env`) and never committed to source control.
- **Signed Expiring URLs:** Videos and downloadable PDFs are served through signed URLs or token-authenticated proxies rather than exposing unprotected cloud storage bucket endpoints.
- **Transport Security:** Strict Helmet headers with Content Security Policy and TLS/HTTPS redirection in production.

---

## 4. Insecure Design & Payment Protection (A04:2021)
- **Idempotency Keys:** Payment checkout supports client-provided idempotency keys to guarantee that network retries never trigger duplicate payment authorizations.
- **Session Timers:** KHQR payment sessions expire strictly after 5 minutes (300 seconds), preventing delayed re-use of expired QR codes.

---

## 5. Security Misconfiguration & Upload Sanitization (A05:2021)
- **File Upload Whitelisting:** `multer` middleware strictly validates MIME types (`video/mp4`, `application/pdf`, `image/webp`) based on target folder.
- **File Renaming:** Uploaded files are automatically renamed with randomized timestamped hashes to prevent path traversal or overwriting existing system files.
- **File Size Limits:** Hard ceiling of 500MB on video streams and 20MB on document attachments.

---

## 6. Vulnerable and Outdated Components (A06:2021)
- Regular audit via `npm audit` across backend and frontend dependencies.
- Zero known critical vulnerabilities in active runtime dependencies.

---

## 7. Software and Data Integrity Failures (A08:2021)
- **Certificate Verification:** Public certificates are indexed by unique non-sequential codes and verifiable against the primary database record.
- **Automated Database Backups:** Backups in `/admin/backups` include SHA-256 verification to ensure snapshot integrity before restoration.

---

## 8. Security Logging and Monitoring (A09:2021)
- Administrative actions, user role modifications, and payment refund events are recorded in the PostgreSQL `AuditLog` table.
- System error handler captures unhandled exceptions with clean generic user messages while preserving detailed stack traces in logs.
