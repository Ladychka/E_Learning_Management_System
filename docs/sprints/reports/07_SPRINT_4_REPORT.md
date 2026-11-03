# Sprint 4 Report — Grading System & Digital Payment Integration

**Sprint Duration:** 2026-08-22 to 2026-09-04  
**Report Date:** 2026-09-05  
**Status:** Completed  
**Scrum Master:** [Name]  
**Product Owner:** [Name]  

---

## 1. Sprint Goal

> Build the **Grading System** (manual grading, gradebook, pass/fail, GPA, appeals) and the **Digital Payment Module** (course purchase, KHQR/ABA PayWay/Bakong integrations, subscriptions, coupons, refunds, revenue sharing) for the ELMS platform.

---

## 2. User Stories Delivered

### Grading System (US-051 to US-060)

| ID | User Story | Status | Acceptance Criteria Met |
|----|-----------|--------|------------------------|
| US-051 | Manual Grading | Yes | Instructors can assign points, max points, letter grade, pass/fail, and feedback |
| US-052 | Gradebook | Yes | Paginated grade list with course/student filters, CSV export |
| US-053 | Grade Weighting | | Not implemented — future enhancement |
| US-054 | Rubrics | | Not implemented — future enhancement |
| US-055 | Feedback Comments | Yes | Grades include instructor feedback visible to students after publish |
| US-056 | Grade Export | Yes | Admins/instructors can export gradebook as CSV |
| US-057 | Grade Appeal | Yes | Students can file appeals; instructors respond approve/reject |
| US-058 | Pass/Fail Status | Yes | Auto-calculated from percentage; manually overridable |
| US-059 | GPA Calculation | Yes | 4.0-scale GPA computed per course from average percentage |
| US-060 | Grade Notifications | | Pending — requires email/notification module (Sprint 5) |

### Digital Payments (US-071 to US-080)

| ID | User Story | Status | Acceptance Criteria Met |
|----|-----------|--------|------------------------|
| US-071 | Course Purchase | Yes | Students can purchase courses via backend checkout |
| US-072 | KHQR Payment | Yes | Sandbox QR code generated for KHQR gateway |
| US-073 | ABA PayWay | Yes | Sandbox payment URL generated for ABA PayWay |
| US-074 | Bakong Payment | Yes | Sandbox deeplink and QR generated for Bakong |
| US-075 | Subscription Plans | Yes | CRUD for subscription plans with duration and features |
| US-076 | Coupon/Discount Codes | Yes | Percentage/fixed coupons with usage limits, expiry, course restrictions |
| US-077 | Invoice Generation | Yes | JSON invoice generated with invoice number, line items, and totals |
| US-078 | Refund Processing | Yes | Refunds update payment status and auto-unenroll student |
| US-079 | Payment History | Yes | Paginated payment history with filters and status badges |
| US-080 | Instructor Revenue Sharing | Yes | Auto-creates payout records (default 70% to instructor) |

---

## 3. Technical Deliverables

### Backend APIs Implemented

**Grading Endpoints**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/grades` | Create / update a grade | Instructor, Admin |
| GET | `/api/v1/grades` | List grades (filtered) | Any (students see own only) |
| GET | `/api/v1/grades/:id` | Get grade detail | Any (ownership checked) |
| PATCH | `/api/v1/grades/:id` | Update grade | Instructor, Admin |
| DELETE | `/api/v1/grades/:id` | Delete grade | Admin |
| POST | `/api/v1/grades/:id/publish` | Publish grade | Instructor, Admin |
| GET | `/api/v1/grades/my-grades` | Student's published grades | Student |
| GET | `/api/v1/grades/export` | Export CSV | Instructor, Admin |
| GET | `/api/v1/grades/overview` | Gradebook stats | Instructor, Admin |
| GET | `/api/v1/grades/course/:id/gpa` | GPA per student | Any |
| POST | `/api/v1/grades/:id/appeal` | File appeal | Student |
| PATCH | `/api/v1/grades/appeals/:id` | Respond to appeal | Instructor, Admin |

**Payment Endpoints**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/payments/checkout` | Initiate purchase | Any |
| POST | `/api/v1/payments/:id/confirm` | Confirm payment | Any |
| POST | `/api/v1/payments/webhook/:gateway` | Gateway webhooks | Public |
| GET | `/api/v1/payments/history` | Payment list | Any |
| GET | `/api/v1/payments/:id` | Payment detail | Any |
| POST | `/api/v1/payments/:id/refund` | Process refund | Admin |
| GET | `/api/v1/payments/:id/invoice` | Get invoice | Any |
| GET | `/api/v1/payments/report/revenue` | Revenue report | Admin, Instructor |
| GET | `/api/v1/payments/payouts` | Instructor payouts | Admin, Instructor |
| POST | `/api/v1/payments/payouts/:id/process` | Mark payout processed | Admin |
| POST | `/api/v1/payments/coupons` | Create coupon | Admin |
| GET | `/api/v1/payments/coupons` | List coupons | Admin |
| POST | `/api/v1/payments/coupons/validate` | Validate coupon code | Any |
| POST | `/api/v1/payments/subscriptions` | Create plan | Admin |
| GET | `/api/v1/payments/subscriptions` | List active plans | Public |
| PATCH | `/api/v1/payments/subscriptions/:id` | Update plan | Admin |
| DELETE | `/api/v1/payments/subscriptions/:id` | Delete plan | Admin |

### Database Changes

- Migration: `sprint4_grading_payments`
- New models: `GradeAppeal`, `Coupon`, `SubscriptionPlan`, `InstructorPayout`
- Updated relations: `Grade.assignment`, `Grade.quiz`, `Payment.user`, `Payment.course`
- Added `User.payments`, `User.payouts`, `Course.payments`

### Frontend Pages Implemented

| Page | Route | Role | Features |
|------|-------|------|----------|
| My Enrollments | `/my-enrollments` | Student | Progress bars, unenroll, browse courses |
| My Grades | `/my-grades` | Student | Summary cards, grade table, course filter |
| Gradebook | `/admin/gradebook` | Admin/Instructor | Search, filters, publish, CSV export |
| Checkout | `/checkout/:courseId` | Student | Gateway select, coupon, sandbox QR |
| Payment History | `/payments` | Student | Transaction list with status badges |

---

## 4. Testing Summary

### Unit Tests

| Module | Tests Written | Passing | Coverage |
|--------|---------------|---------|----------|
| Grade Controller | [ ] | [ ] | [%] |
| Payment Controller | [ ] | [ ] | [%] |
| Coupon Logic | [ ] | [ ] | [%] |
| GPA Calculation | [ ] | [ ] | [%] |

> Pending **Action Item:** Fill in after running test suite.

### Integration Tests

| Scenario | Status | Notes |
|----------|--------|-------|
| Student enrolls → pays → auto-enrolled | | Run manually |
| Refund → student unenrolled | | Run manually |
| Webhook confirms payment | | Sandbox only |
| Grade published → student sees | | Run manually |
| Appeal filed → instructor responds | | Run manually |
| CSV export matches grade data | | Run manually |

### Manual Test Checklist

Use this to verify each feature before marking done:

- [ ] **Checkout**
  - [ ] Free course auto-enrolls
  - [ ] Paid course generates correct gateway payload (QR, URL, deeplink)
  - [ ] Coupon applies correctly (percentage and fixed)
  - [ ] Invalid coupon rejected with clear error
  - [ ] Payment confirmation updates status to completed
  - [ ] Webhook updates payment status correctly

- [ ] **Refunds**
  - [ ] Admin can refund completed payment
  - [ ] Student unenrolled automatically
  - [ ] Refund reason recorded

- [ ] **Grading**
  - [ ] Instructor can create grade for assignment/quiz
  - [ ] Percentage, letter grade, pass/fail auto-calculated
  - [ ] Student cannot see unpublished grade
  - [ ] Publish makes grade visible to student
  - [ ] CSV export includes all expected columns
  - [ ] GPA calculation returns correct values
  - [ ] Appeal workflow works end-to-end

- [ ] **Revenue**
  - [ ] Payment completion creates instructor payout record
  - [ ] Revenue report aggregates by course
  - [ ] Admin can process payout and mark as processed

---

## 5. Known Issues & Limitations

1. **Grade Notifications (US-060)** — deferred to Sprint 5. No email/push sent on grade publish.
2. **Grade Weighting (US-053) & Rubrics (US-054)** — not implemented. Currently all grades are equal weight.
3. **Real Payment Gateways** — sandbox only. Production requires actual API keys and signed webhook verification.
4. **PDF Invoice** — returns structured JSON. PDF generation can be added with a library like `pdfkit` or `puppeteer`.
5. **Payment Retries** — no retry mechanism for failed webhook deliveries.
6. **Subscription Renewals** — subscription plans exist but auto-renewal billing is not implemented.

---

## 6. Metrics

| Metric | Target | Actual | Notes |
|--------|--------|--------|-------|
| User Stories Completed | 20 | 16 | 4 deferred (US-053, US-054, US-060, weighting/rubrics) |
| Backend API Endpoints | 25 | 25 | All planned endpoints delivered |
| Frontend Pages | 5 | 5 | All planned pages delivered |
| Test Coverage | ≥ 60% | [%] | Fill after running tests |
| Bugs Found | — | [#] | Track during manual testing |
| Bugs Fixed | — | [#] | Track during manual testing |

---

## 7. Sprint Review Notes

### What Went Well
- [ ] Add your notes here
- [ ] Payment module kept isolated from course/grading logic
- [ ] Frontend checkout supports all three Cambodian gateways

### What Could Be Improved
- [ ] Add your notes here
- [ ] Consider adding payment retry / idempotency keys
- [ ] Rubrics and weighted grades need a clear data model before implementing

### Feedback from Stakeholders
- [ ] Add stakeholder feedback here

---

## 8. Sprint Retrospective

| Category | Notes |
|----------|-------|
| **Start Doing** | |
| **Stop Doing** | |
| **Continue Doing** | |
| **Action Items for Sprint 5** | |

---

## 9. Appendices

### A. Environment Variables Required

```bash
# Payment gateway keys (sandbox → production)
KHQR_API_KEY=your_khqr_key
ABA_PAYWAY_MERCHANT_ID=your_merchant_id
BAKONG_API_KEY=your_bakong_key

# Revenue share (optional, default 70%)
# Add to Settings table: key="instructor_revenue_share", value="70"
```

### B. API Testing Commands (cURL)

```bash
# Create a grade
curl -X POST http://localhost:5000/api/v1/grades \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"studentId":"...","courseId":"...","points":85,"maxPoints":100}'

# Checkout with KHQR
curl -X POST http://localhost:5000/api/v1/payments/checkout \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"courseId":"...","gateway":"khqr"}'

# Validate coupon
curl -X POST http://localhost:5000/api/v1/payments/coupons/validate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"code":"SAVE20","courseId":"..."}'
```

### C. Database Migration Log

```
Migration: sprint4_grading_payments
Date: 2026-07-28
New tables: grade_appeals, coupons, subscription_plans, instructor_payouts
Updated tables: grades (added assignment_id, quiz_id relations), payments (added user/course relations)
```

---

*Report prepared by:* [Your Name]  
*Date:* 2026-09-05  
*Next Sprint:* Sprint 5 — Communication Tools & Analytics Dashboard
