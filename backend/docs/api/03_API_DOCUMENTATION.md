# API Documentation

**Base URL:** `http://localhost:5000/api/v1`  
**Content-Type:** `application/json`  
**Authentication:** Bearer token in `Authorization` header

---

## Authentication Endpoints

### Register
```http
POST /auth/register
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "STUDENT"  // optional, default: STUDENT
}
```
**Response 201:**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "STUDENT",
    "status": "PENDING_VERIFICATION",
    "createdAt": "2026-07-24T00:00:00Z"
  }
}
```

### Login
```http
POST /auth/login
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```
**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "jwt_string",
    "refreshToken": "random_string",
    "expiresIn": "7d",
    "user": { ... }
  }
}
```

### Logout
```http
POST /auth/logout
```
**Headers:** `Authorization: Bearer <token>`  
**Body:** `{ "refreshToken": "..." }` (optional)

### Refresh Token
```http
POST /auth/refresh
```
**Body:** `{ "refreshToken": "..." }`  
**Response:** New access token

### Get Current User
```http
GET /auth/me
```
**Headers:** `Authorization: Bearer <token>`

### Update Profile
```http
PATCH /auth/profile
```
**Headers:** `Authorization: Bearer <token>`  
**Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Software engineer",
  "phone": "+85512345678",
  "address": "Phnom Penh",
  "education": "BSc Computer Science",
  "occupation": "Developer"
}
```

### Change Password
```http
POST /auth/change-password
```
**Headers:** `Authorization: Bearer <token>`  
**Body:**
```json
{
  "currentPassword": "old_pass",
  "newPassword": "NewPass123"
}
```

### Deactivate Account
```http
POST /auth/deactivate
```
**Headers:** `Authorization: Bearer <token>`  
**Body:** `{ "password": "current_password" }`

### Verify Email
```http
GET /auth/verify-email?token=verification_token
```

### Forgot Password
```http
POST /auth/forgot-password
```
**Body:** `{ "email": "user@example.com" }`  
**Note:** Always returns 200 even if email doesn't exist (security)

### Reset Password
```http
POST /auth/reset-password
```
**Body:**
```json
{
  "token": "reset_token",
  "password": "NewPass123"
}
```

---

## User Management (Admin Only)

### List Users
```http
GET /users?page=1&limit=10&role=STUDENT&status=ACTIVE&search=john&sortBy=createdAt&order=desc
```
**Headers:** `Authorization: Bearer <token>`  
**Required Role:** ADMIN

### Get User by ID
```http
GET /users/:id
```

### Create User
```http
POST /users
```
**Body:**
```json
{
  "email": "new@example.com",
  "password": "TempPass123",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "INSTRUCTOR",
  "status": "ACTIVE"
}
```

### Update User
```http
PATCH /users/:id
```
**Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "ADMIN",
  "status": "ACTIVE"
}
```

### Delete User
```http
DELETE /users/:id
```

### Suspend User
```http
POST /users/:id/suspend
```
**Body:** `{ "reason": "Violation of terms" }` (optional)

### Reactivate User
```http
POST /users/:id/reactivate
```

---

## Courses

### List Courses
```http
GET /courses?page=1&limit=10&status=PUBLISHED&categoryId=uuid&level=BEGINNER&search=web&instructorId=uuid&isFree=true
```
**Access:** Public for published; instructors see own + published; admins see all

### Get Course Detail
```http
GET /courses/:id
```
**Response includes:** instructor info, category, published modules with lessons, enrollment count

### Create Course
```http
POST /courses
```
**Headers:** `Authorization: Bearer <token>`  
**Required Role:** INSTRUCTOR or ADMIN  
**Body:**
```json
{
  "title": "Web Development Fundamentals",
  "description": "Learn HTML, CSS, and JS",
  "shortDesc": "Beginner web dev",
  "categoryId": "uuid",
  "level": "BEGINNER",
  "price": 29.99,
  "currency": "USD",
  "isFree": false,
  "duration": 1200,
  "language": "en",
  "prerequisites": ["Basic computer skills"],
  "learningOutcomes": ["Build responsive websites"],
  "tags": ["web", "javascript"],
  "scheduledAt": "2026-08-01T00:00:00Z"
}
```

### Update Course
```http
PATCH /courses/:id
```
**Access:** Course owner (instructor) or ADMIN

### Delete Course
```http
DELETE /courses/:id
```
**Access:** Course owner (instructor) or ADMIN

---

## Categories (Admin Only for Write)

### List Categories
```http
GET /categories?parentId=uuid&includeInactive=false
```

### Get Category Detail
```http
GET /categories/:id
```

### Create Category
```http
POST /categories
```
**Body:**
```json
{
  "name": "Programming",
  "slug": "programming",
  "description": "Software development",
  "icon": "code",
  "parentId": "uuid",
  "sortOrder": 1
}
```

### Update Category
```http
PATCH /categories/:id
```

### Delete Category
```http
DELETE /categories/:id
```
**Constraint:** Cannot delete if courses are associated

---

## Common HTTP Status Codes

| Code | Meaning | When Returned |
|------|---------|---------------|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST (register, create course, etc.) |
| 400 | Bad Request | Validation errors |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate email, duplicate slug, etc. |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

---

## Pagination Format

List endpoints return paginated results:
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

**Query Parameters:**
- `page` — page number (default: 1)
- `limit` — items per page (default: 10, max: 50)
- `sortBy` — field to sort by (default: `createdAt`)
- `order` — `asc` or `desc` (default: `desc`)

---

*Document Version: 1.0*  
*Last Updated: 2026-07-24*  
*Note: Endpoints for Sprint 2+ (modules, lessons, quizzes, assignments, payments) will be added as they are implemented.*
