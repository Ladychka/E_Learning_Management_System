# Database Schema Documentation

**Database:** PostgreSQL 15+  
**ORM:** Prisma 5  
**Migration Strategy:** Prisma Migrate with version-controlled schema

---

## Table Reference

### 1. users

Stores all platform accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, default(uuid()) | Unique identifier |
| email | String | Unique, indexed | Login identifier |
| password_hash | String | Not null | bcrypt hash |
| first_name | String | Not null | Given name |
| last_name | String | Not null | Family name |
| avatar_url | String | Nullable | Profile picture URL |
| role | Enum | Default: STUDENT | STUDENT, INSTRUCTOR, ADMIN |
| status | Enum | Default: PENDING_VERIFICATION | ACTIVE, INACTIVE, SUSPENDED, PENDING_VERIFICATION |
| is_email_verified | Boolean | Default: false | Email confirmation status |
| email_verified_at | DateTime | Nullable | When email was verified |
| last_login_at | DateTime | Nullable | Most recent login timestamp |
| created_at | DateTime | Default: now() | Account creation |
| updated_at | DateTime | Updated automatically | Last modification |
| deactivated_at | DateTime | Nullable | Soft-deletion timestamp |

**Indexes:**
- `email` — unique (auto-index by constraint)
- `role` + `status` — composite for admin queries

---

### 2. profiles

Extended user information (one-to-one with users).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → users.id, unique, cascade | Linked account |
| bio | String | Nullable | Short biography |
| phone | String | Nullable | Contact number |
| address | String | Nullable | Physical address |
| date_of_birth | DateTime | Nullable | Birth date |
| education | String | Nullable | Academic background |
| occupation | String | Nullable | Job title |
| preferences | Json | Default: {} | User settings object |

---

### 3. refresh_tokens

Session management for JWT refresh rotation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → users.id, cascade | Token owner |
| token | String | Unique | 80-char random hex |
| expires_at | DateTime | Not null | Token expiry |
| created_at | DateTime | Default: now() | Issued timestamp |
| revoked_at | DateTime | Nullable | When revoked |
| ip_address | String | Nullable | Client IP |
| user_agent | String | Nullable | Client browser info |

**Indexes:**
- `token` — unique (auto-index)
- `user_id` — for user session lookups

---

### 4. password_resets

Secure password reset tokens.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → users.id, cascade | Requester |
| token | String | Unique | 64-char random hex |
| expires_at | DateTime | Not null | 1-hour expiry |
| used_at | DateTime | Nullable | When consumed |
| created_at | DateTime | Default: now() | Request timestamp |

**Indexes:**
- `token` — unique (auto-index)

---

### 5. email_verifications

Email confirmation tokens.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → users.id, cascade | New registrant |
| token | String | Unique | 64-char random hex |
| expires_at | DateTime | Not null | 24-hour expiry |
| used_at | DateTime | Nullable | When consumed |
| created_at | DateTime | Default: now() | Request timestamp |

**Indexes:**
- `token` — unique (auto-index)

---

### 6. categories

Hierarchical course taxonomy.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | String | Unique | Display name |
| slug | String | Unique | URL-friendly identifier |
| description | String | Nullable | Category description |
| icon | String | Nullable | Icon identifier |
| parent_id | UUID | FK → categories.id, nullable | Parent category |
| sort_order | Int | Default: 0 | Display ordering |
| is_active | Boolean | Default: true | Visibility flag |
| created_at | DateTime | Default: now() | Creation date |
| updated_at | DateTime | Updated automatically | Last edit |

**Self-Relation:** One category can have many children categories.

**Indexes:**
- `slug` — unique (auto-index)
- `parent_id` — for tree queries
- `is_active` + `sort_order` — for catalog display

---

### 7. courses

Core course metadata and publishing state.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| title | String | Not null | Course name |
| slug | String | Unique | URL-friendly |
| description | String | Nullable | Full description |
| short_desc | String | Nullable | Tagline |
| thumbnail_url | String | Nullable | Cover image URL |
| status | Enum | Default: DRAFT | DRAFT, PUBLISHED, ARCHIVED |
| price | Decimal(10,2) | Nullable | Course price |
| currency | String | Default: USD | Price currency |
| is_free | Boolean | Default: false | Free course flag |
| instructor_id | UUID | FK → users.id | Course creator |
| category_id | UUID | FK → categories.id, nullable | Classification |
| level | String | Nullable | BEGINNER, INTERMEDIATE, ADVANCED |
| duration | Int | Nullable | Estimated minutes |
| language | String | Default: en | Course language |
| prerequisites | Json | Default: [] | Required skills/courses |
| learning_outcomes | Json | Default: [] | What students will learn |
| tags | String[] | Default: [] | Searchable tags |
| published_at | DateTime | Nullable | Go-live timestamp |
| scheduled_at | DateTime | Nullable | Future publish date |
| created_at | DateTime | Default: now() | Creation date |
| updated_at | DateTime | Updated automatically | Last edit |

**Indexes:**
- `slug` — unique (auto-index)
- `status` + `category_id` — for catalog queries
- `instructor_id` — for instructor dashboards
- `is_free` — for free course filters

---

### 8. modules

Course sections containing lessons.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| course_id | UUID | FK → courses.id, cascade | Parent course |
| title | String | Not null | Module name |
| description | String | Nullable | Module overview |
| sort_order | Int | Default: 0 | Display order |
| is_published | Boolean | Default: false | Visibility |
| created_at | DateTime | Default: now() | Creation date |
| updated_at | DateTime | Updated automatically | Last edit |

**Indexes:**
- `course_id` + `sort_order` — for ordered listing

---

### 9. lessons

Individual learning units within modules.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| module_id | UUID | FK → modules.id, cascade | Parent module |
| title | String | Not null | Lesson name |
| description | String | Nullable | Lesson overview |
| content_type | String | Not null | video, pdf, text, quiz |
| content_url | String | Nullable | File/video URL |
| duration | Int | Nullable | Minutes |
| is_published | Boolean | Default: false | Visibility |
| is_preview | Boolean | Default: false | Free preview |
| sort_order | Int | Default: 0 | Display order |
| attachments | Json | Default: [] | Supplementary files |
| created_at | DateTime | Default: now() | Creation date |
| updated_at | DateTime | Updated automatically | Last edit |

**Indexes:**
- `module_id` + `sort_order` — for ordered listing
- `is_preview` — for free preview queries

---

### 10. enrollments

Student course registrations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → users.id, cascade | Enrolled student |
| course_id | UUID | FK → courses.id, cascade | Target course |
| status | String | Default: active | active, completed, dropped, expired |
| progress_percent | Int | Default: 0 | Completion percentage |
| enrolled_at | DateTime | Default: now() | Registration date |
| enrolled_by | String | Nullable | self or admin user ID |
| completed_at | DateTime | Nullable | Finish date |
| expires_at | DateTime | Nullable | Access expiry |
| certificate_url | String | Nullable | Generated certificate |

**Constraints:**
- Unique: (`user_id`, `course_id`) — prevents duplicate enrollments

**Indexes:**
- `user_id` — for "my courses" queries
- `course_id` — for course enrollment counts
- `status` — for filtering active/completed

---

### 11. assignments

Instructor-created assignments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| course_id | UUID | FK → courses.id, cascade | Parent course |
| created_by | UUID | FK → users.id | Creator |
| title | String | Not null | Assignment name |
| description | String | Nullable | Instructions |
| instructions | String | Nullable | Detailed steps |
| max_points | Int | Default: 100 | Maximum score |
| due_date | DateTime | Nullable | Deadline |
| allow_late | Boolean | Default: false | Late submission policy |
| attachments | Json | Default: [] | Reference files |
| is_published | Boolean | Default: false | Visibility |
| created_at | DateTime | Default: now() | Creation date |
| updated_at | DateTime | Updated automatically | Last edit |

**Indexes:**
- `course_id` — for course assignment lists
- `due_date` — for upcoming deadline queries

---

### 12. submissions

Student assignment uploads.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| assignment_id | UUID | FK → assignments.id, cascade | Target assignment |
| student_id | UUID | FK → users.id, cascade | Submitter |
| content | String | Nullable | Text response |
| file_urls | String[] | Default: [] | Uploaded files |
| submitted_at | DateTime | Default: now() | Submission timestamp |
| is_late | Boolean | Default: false | Past deadline flag |

**Indexes:**
- `assignment_id` + `student_id` — for uniqueness checks
- `student_id` — for "my submissions" queries

---

### 13. grades

Score records for assignments and quizzes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| student_id | UUID | FK → users.id, cascade | Graded student |
| course_id | UUID | FK → courses.id, cascade | Course context |
| assignment_id | UUID | Nullable, FK → assignments.id | Source assignment |
| quiz_id | UUID | Nullable | Source quiz |
| points | Decimal(10,2) | Not null | Earned points |
| max_points | Decimal(10,2) | Default: 100 | Total possible |
| percentage | Decimal(5,2) | Not null | Calculated score |
| letter_grade | String | Nullable | A, B, C, etc. |
| pass_fail | String | Nullable | pass or fail |
| feedback | String | Nullable | Instructor comments |
| is_published | Boolean | Default: false | Student visibility |
| published_at | DateTime | Nullable | When released |
| graded_by | UUID | Nullable, FK → users.id | Grader |
| created_at | DateTime | Default: now() | Record date |
| updated_at | DateTime | Updated automatically | Last modification |

**Indexes:**
- `student_id` + `course_id` — for gradebook queries
- `is_published` — for filtering released grades

---

### 14. payments

Transaction records (Sprint 4).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → users.id | Payer |
| course_id | UUID | Nullable, FK → courses.id | Purchased course |
| subscription_id | String | Nullable | Subscription reference |
| amount | Decimal(10,2) | Not null | Transaction amount |
| currency | String | Default: USD | Transaction currency |
| status | String | Default: pending | pending, completed, failed, refunded |
| gateway | String | Not null | khqr, aba_payway, bakong |
| gateway_ref | String | Nullable | Provider transaction ID |
| coupon_code | String | Nullable | Applied discount code |
| discount_amount | Decimal(10,2) | Nullable | Discount value |
| metadata | Json | Nullable | Provider-specific data |
| paid_at | DateTime | Nullable | Completion timestamp |
| refunded_at | DateTime | Nullable | Refund timestamp |
| refund_reason | String | Nullable | Why refunded |
| created_at | DateTime | Default: now() | Initiation timestamp |
| updated_at | DateTime | Updated automatically | Last status change |

**Indexes:**
- `user_id` — for payment history
- `gateway_ref` — for provider reconciliation
- `status` — for reporting queries

---

### 15. audit_logs

Immutable activity records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | Nullable, FK → users.id, set null | Actor |
| action | String | Not null | REGISTER, LOGIN, UPDATE_COURSE, etc. |
| entity | String | Not null | User, Course, Grade, etc. |
| entity_id | String | Nullable | Affected record ID |
| old_values | Json | Nullable | Previous state |
| new_values | Json | Nullable | New state |
| ip_address | String | Nullable | Client IP |
| user_agent | String | Nullable | Client browser |
| created_at | DateTime | Default: now() | Event timestamp |

**Indexes:**
- `entity` + `created_at` — for report queries
- `user_id` — for user activity trails

---

### 16. settings

System configuration key-value store.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| key | String | Unique | Setting identifier |
| value | String | Not null | Setting value |
| type | String | Default: string | string, number, boolean, json |
| group | String | Default: general | Setting category |
| label | String | Nullable | Display name |
| description | String | Nullable | Help text |
| is_public | Boolean | Default: false | Exposed to frontend |
| updated_at | DateTime | Updated automatically | Last change |

**Indexes:**
- `key` — unique (auto-index)
- `group` — for admin settings pages

---

## Entity Relationship Summary

```
users ||--o| profiles : has
users ||--o{ refresh_tokens : owns
users ||--o{ password_resets : requests
users ||--o{ email_verifications : receives
users ||--o{ courses : instructs
users ||--o{ enrollments : has
users ||--o{ assignments : creates
users ||--o{ submissions : makes
users ||--o{ grades : receives
users ||--o{ grades : gives
users ||--o{ audit_logs : generates

categories ||--o{ categories : parents
categories ||--o{ courses : contains

courses ||--o{ modules : contains
courses ||--o{ enrollments : has
courses ||--o{ assignments : has
courses ||--o{ grades : has

modules ||--o{ lessons : contains

lessons ||--o| quizzes : may have

assignments ||--o{ submissions : receives
```

---

## Migration History

| Migration | Date | Description |
|-----------|------|-------------|
| `init` | 2026-07-24 | Initial schema creation — all Sprint 1 tables |
| (pending) | Sprint 2 | Module, lesson, quiz, question tables activation |
| (pending) | Sprint 3 | Enrollment status expansions, assignment enhancements |
| (pending) | Sprint 4 | Payment gateway metadata expansion |
| (pending) | Sprint 5 | Communication tables (forums, messages) |
| (pending) | Sprint 6 | Gamification, AI recommendation tables |

---

*Document Version: 1.0*  
*Last Updated: 2026-07-24*
