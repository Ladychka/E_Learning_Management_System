# ELMS — Fintech E-Learning Management System

[![Backend Vitest](https://img.shields.io/badge/Vitest-18%20Passed-emerald)](file:///d:/AUB%20Y4%20S1/Financial%20application%20design%20%28Teacher%20Piseth%20%29/FinTech/FinTech/elms/backend)
[![Flutter Tests](https://img.shields.io/badge/Flutter-6%20Passed-blue)](file:///d:/AUB%20Y4%20S1/Financial%20application%20design%20%28Teacher%20Piseth%20%29/FinTech/FinTech/elms/mobile)
[![OpenAPI 3.0](https://img.shields.io/badge/Swagger-API%20Docs-success)](http://localhost:5000/api/docs)
[![Cambodian Fintech](https://img.shields.io/badge/NBC-KHQR%20%7C%20Bakong-crimson)](file:///d:/AUB%20Y4%20S1/Financial%20application%20design%20%28Teacher%20Piseth%20%29/FinTech/FinTech/elms/docs/PAYMENTS.md)

A complete, production-grade **Fintech E-Learning Management System (ELMS)** designed for Cambodian banking, microfinance, and technology education. Features official National Bank of Cambodia (NBC) KHQR payment rails, interactive finance calculators, bilingual localization (Khmer + English), weighted gradebooks, rubric grading, and public QR certificate verification.

---

## 🏛️ System Architecture

```
elms/
├── backend/          # Node.js 20 + Express + TypeScript + Prisma ORM + PostgreSQL
├── frontend/         # React 18 + Vite + TypeScript + Tailwind CSS (Bilingual EN/KM)
├── mobile/           # Flutter 3.22 + BLoC + Material 3 (iOS & Android)
├── docs/             # Complete production & operational documentation
└── docker-compose.yml# Container orchestration
```

---

## ✨ Key Platform Features

1. **Cambodian Finance Hub (`/finance-tools`)**:
   - Loan / EMI Amortization calculator (reducing balance breakdown).
   - Compound Interest & Savings Goal projection simulator.
   - 50/30/20 Monthly Budgeting planner with instant USD and KHR allocation.
   - Live USD ↔ KHR Currency Converter with official NBC 4,100 KHR benchmark rate.
   - Searchable Cambodian Fintech Glossary (KHQR, Bakong, NBC, CBC, EMI, AML/CFT).
2. **Trustworthy Payments & KHQR**:
   - Native Cambodian KHQR dynamic QR generation with a 5-minute security timer.
   - 3-second automatic polling and sandbox test rail simulation (`POST /api/v1/payments/:id/confirm`).
   - Dual currency pricing: e.g. `$25.00 (≈ 102,500 ៛)`.
   - Idempotency key support preventing duplicate charges.
3. **Advanced Learning Experience**:
   - Video player with speed controls (0.75x–2.0x), auto-advance countdown banner, and timestamped personal notes.
   - Sidecar slide-over financial calculator drawer inside the lesson player.
   - Timed quizzes with immediate answer rationales and drag-and-drop assignment submissions.
4. **Academics & Pedagogy**:
   - Grade Weighting categories (Quizzes 30%, Assignments 30%, Final 40%) summing to 100%.
   - Interactive Rubrics builder and criteria-based grading interface.
   - Public Certificate verification view (`/verify/:certificateNumber`) with dynamic QR codes.
5. **Bilingual Localization & Design System**:
   - English 🇺🇸 and authentic Khmer 🇰🇭 translations (`Kantumruy Pro` / `Battambang` fonts).
   - Theme tokens: Emerald primary (`#10B981`), Navy Slate neutrals (`#0F172A`), Gold badges.
   - System/manual Dark Mode support across Web and Mobile.
   - Low-bandwidth Data Saver toggle for Cambodian mobile connections.

---

## 🚀 Quick Start

### 1. Database & Backend
```bash
cd elms
docker compose up -d          # Starts PostgreSQL on port 5435
cd backend
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev                   # API server running on http://localhost:5000
```

### 2. Web Console (React + Vite)
```bash
cd elms/frontend
npm install
npm run dev                   # Web app running on http://localhost:5173
```

### 3. Student Mobile App (Flutter)
```bash
cd elms/mobile
flutter pub get
flutter run                   # Runs on Android emulator, iOS simulator, or Web
```

---

## 🔑 Demo Credentials

| Role | Email | Password | Primary Capabilities |
|---|---|---|---|
| **Admin** | `admin@elms.edu.kh` | `Password123!` | Audit logs, DB snapshots, settings, payouts |
| **Instructor** | `instructor@elms.edu.kh` | `Password123!` | Course builder, rubrics, gradebook, quiz authoring |
| **Student** | `student@elms.edu.kh` | `Password123!` | Course enrollments, KHQR checkout, certificates, quizzes |

---

## 🧪 Verification & Automated Tests

### Backend Tests (Vitest)
```bash
cd elms/backend
npm test
# Result: 6 test suites, 18 tests passed (Auth, Rubrics, Grade Weighting, Payments, Quiz Scoring, Cambodian Rates)
```

### Mobile Tests (Flutter Test)
```bash
cd elms/mobile
flutter test
# Result: 6 tests passed (EMI calculation, 50/30/20 allocation, NBC exchange, LocaleCubit, Smoke test)
```

### Type Checking & Build Verification
```bash
cd elms/backend && npx tsc --noEmit           # 0 errors
cd elms/frontend && npm run build             # 0 errors, built in ~4s
cd elms/mobile && flutter analyze             # No issues found!
```

---

## 📚 Documentation Index

- [Administrator Manual](file:///d:/AUB%20Y4%20S1/Financial%20application%20design%20%28Teacher%20Piseth%20%29/FinTech/FinTech/elms/docs/ADMIN_MANUAL.md)
- [Student & Instructor User Guide](file:///d:/AUB%20Y4%20S1/Financial%20application%20design%20%28Teacher%20Piseth%20%29/FinTech/FinTech/elms/docs/USER_GUIDE.md)
- [API Reference & OpenAPI Specification](file:///d:/AUB%20Y4%20S1/Financial%20application%20design%20%28Teacher%20Piseth%20%29/FinTech/FinTech/elms/docs/API.md)
- [Production Deployment Guide](file:///d:/AUB%20Y4%20S1/Financial%20application%20design%20%28Teacher%20Piseth%20%29/FinTech/FinTech/elms/docs/DEPLOYMENT.md)
- [Cambodian Payment Rails & KHQR Guide](file:///d:/AUB%20Y4%20S1/Financial%20application%20design%20%28Teacher%20Piseth%20%29/FinTech/FinTech/elms/docs/PAYMENTS.md)
- [5-Minute Demo & Presentation Script](file:///d:/AUB%20Y4%20S1/Financial%20application%20design%20%28Teacher%20Piseth%20%29/FinTech/FinTech/elms/docs/DEMO_SCRIPT.md)
- [OWASP Top 10 Security Audit](file:///d:/AUB%20Y4%20S1/Financial%20application%20design%20%28Teacher%20Piseth%20%29/FinTech/FinTech/elms/docs/SECURITY.md)
- [Project Changelog](file:///d:/AUB%20Y4%20S1/Financial%20application%20design%20%28Teacher%20Piseth%20%29/FinTech/FinTech/elms/docs/CHANGELOG.md)
