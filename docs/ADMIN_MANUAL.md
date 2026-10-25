# ELMS — Administrator Manual

This manual provides instructions for system administrators managing the **Fintech E-Learning Management System (ELMS)**.

---

## 1. Access & Admin Console Overview

- **Web Admin URL:** `http://localhost:5173/admin`
- **Default Superadmin:** `admin@elms.edu.kh` / `Password123!`
- **Capabilities:**
  - Full system audit log inspection
  - Database snapshot creation and restoration
  - System-wide configuration parameters (platform commission, allowed file types, registration toggle)
  - Course moderation and instructor verification
  - Financial reporting and instructor payout settlement

---

## 2. System Settings (`/admin/settings`)

| Setting Key | Default Value | Description |
|---|---|---|
| `platform_name` | ELMS Fintech Academy | Visible portal title across Web and Mobile |
| `commission_rate` | `30%` | Platform share of paid course revenue (70% instructor) |
| `max_upload_size_mb` | `500` | Maximum file size for videos and lesson PDFs |
| `maintenance_mode` | `false` | When true, only administrators may access the API |
| `allow_registration` | `true` | Controls open student self-registration |

---

## 3. Audit Logs (`/admin/audit-logs`)

The system automatically records every administrative mutation and high-risk action in the PostgreSQL database.
- **Logged Events:**
  - Course status transitions (`DRAFT` → `PUBLISHED` → `ARCHIVED`)
  - User role promotions (e.g. promoting Student to Instructor)
  - Instructor payout settlements
  - Manual database backup triggers
  - Payment refund actions
- **Audit Properties:** User ID, Action, Target Entity, Timestamp, IP address, and JSON diff payload.

---

## 4. Database Backups & Disaster Recovery (`/admin/backups`)

- **Automated Snapshots:**
  - Backups can be triggered manually from the UI or via API:
    ```bash
    curl -X POST http://localhost:5000/api/v1/admin/backups \
      -H "Authorization: Bearer <ADMIN_TOKEN>"
    ```
- **Storage Location:** Backups are stored in `uploads/backups/` and registered with SHA-256 integrity checksums.
- **Restoration Procedure:**
  1. Inspect the backup table in `/admin/backups`.
  2. Select the desired timestamp snapshot.
  3. Click **Restore Snapshot** (requires admin password confirmation).

---

## 5. Course Moderation & Quality Checklist

Before approving courses for public listing on the marketplace:
1. Verify **Course Completeness Meter** is at 100% in Course Builder.
2. Ensure course syllabus includes learning outcomes and prerequisites.
3. Verify at least one module contains a video lesson, downloadable PDF resource, and end-of-module quiz.
4. Ensure NBC educational disclaimer is present on financial and investment course materials.

---

## 6. Financial Settlement & Instructor Payouts

- **Revenue Split:** 70% Instructor / 30% Platform.
- **Settlement Cycles:** Monthly payouts can be processed via Bakong Account ID or ABA Account Number.
- **Processing Payouts:** Navigate to `/admin/reports` → **Instructor Payouts** → Click **Process Settlement** to mark records as paid.
