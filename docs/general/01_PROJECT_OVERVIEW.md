# ELMS — E-Learning Management System

## Project Overview

**Project Name:** E-Learning Management System (ELMS)  
**Type:** Capstone / Final Year Project  
**Duration:** 12 Weeks (6 Sprints)  
**Methodology:** Agile Scrum  
**Team Size:** Student Team (typical 3–5 members)

---

## 1. Executive Summary

ELMS is a full-stack web-based Learning Management System designed for educational institutions and independent instructors in Cambodia. The platform supports course creation, student enrollment, assignment and quiz management, digital grading, and local payment integration (KHQR, ABA PayWay, Bakong). Built with modern web technologies, ELMS is scalable, secure, and ready for production deployment.

---

## 2. Problem Statement

Traditional education in Cambodia faces several challenges:
- Limited access to quality learning materials outside classrooms
- No centralized platform for instructors to publish and monetize courses
- Lack of local payment gateways integration for Cambodian learners
- Manual tracking of student progress, grades, and certificates
- Difficulty in managing assignments, quizzes, and feedback at scale

ELMS addresses these gaps by providing a digital-first platform that supports the complete learning lifecycle — from course discovery and enrollment to assessment, grading, and certification.

---

## 3. Project Objectives

1. **Build a robust authentication system** with role-based access (Student, Instructor, Admin)
2. **Enable course creation and management** with modular content (videos, PDFs, quizzes)
3. **Support enrollment workflows** including self-enrollment, waitlists, and bulk enrollment
4. **Implement assessment tools** (assignments and quizzes with auto-grading)
5. **Develop a grading system** with gradebooks, rubrics, and GPA calculation
6. **Integrate Cambodian digital payments** (KHQR, ABA PayWay, Bakong)
7. **Provide communication tools** (forums, messaging, announcements)
8. **Deliver analytics dashboards** for students, instructors, and admins
9. **Ensure system security, performance, and scalability** through testing
10. **Deploy to production** with documentation and user training

---

## 4. Scope

### In Scope
- Web-based LMS with responsive design
- Multi-role user management (Student, Instructor, Admin)
- Course catalog with categories, search, and filters
- Content management (modules, lessons, videos, PDFs, downloadable resources)
- Quiz builder (MCQ, True/False, Short Answer) with auto-grading and timer
- Assignment creation with file submission and deadline enforcement
- Enrollment management with approval workflow and waitlists
- Gradebook with weighting, rubrics, pass/fail, GPA calculation
- Payment integration for Cambodian gateways (sandbox-ready)
- Communication modules (forums, comments, direct messaging, announcements)
- Analytics dashboard with charts and exportable reports
- Audit logging, backup/restore, system settings
- Multi-language support framework
- AI course recommendation and gamification (badge/point system)

### Out of Scope (Future / v2)
- Native mobile iOS/Android applications
- Offline mode / PWA sync
- Live streaming infrastructure (relies on Zoom/Jitsi integration)
- Custom video encoding pipeline (uses S3 + CDN)

---

## 5. Target Users

| User Type | Description |
|-----------|-------------|
| **Student** | Browse courses, enroll, watch lessons, take quizzes, submit assignments, track progress, receive certificates |
| **Instructor** | Create and publish courses, build curriculum, grade submissions, view student analytics, earn revenue |
| **Admin** | Manage users and roles, moderate content, configure system settings, view platform-wide reports, manage payments |

---

## 6. Success Criteria

- All 100 user stories implemented and tested
- Payment gateway sandbox integration verified end-to-end
- System supports 100+ concurrent users with <2s response time
- 90%+ unit test coverage across all API modules
- Successful UAT with at least 10 real users
- Secure deployment with HTTPS, rate limiting, and audit logging

---

## 7. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Payment gateway API changes | High | Abstract payment module; support multiple gateways |
| Scope creep (12-week timeline) | High | Strict sprint boundaries; MVP-first approach |
| Team member unavailability | Medium | Documented architecture; modular code ownership |
| Performance under load | Medium | Load testing in Sprint 5; caching strategy |
| Security vulnerabilities | High | Input validation, parameterized queries, security testing |

---

## 8. Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL 15 |
| ORM | Prisma 5 |
| Auth | JWT (access + refresh tokens), bcrypt |
| File Storage | S3-compatible object storage + CDN |
| Payments | KHQR, ABA PayWay, Bakong (REST APIs) |
| DevOps | Docker, Docker Compose |

---

*Document Version: 1.0*  
*Last Updated: 2026-07-24*  
*Status: Sprint 1 Completed*
