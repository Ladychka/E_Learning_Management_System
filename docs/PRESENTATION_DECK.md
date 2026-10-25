# ELMS — Final Presentation Slide Deck & Oral Defense Script
**Course:** Financial Application Design (Teacher Piseth)  
**Project:** Fintech E-Learning Management System (ELMS)  
**Platform:** Full-Stack (React 18 + Node.js/Express + PostgreSQL + Flutter Mobile)

---

## 📋 Presentation Overview
- **Duration:** 10–15 Minutes (8 mins slides + 5 mins live demo + 2 mins Q&A)
- **Primary Focus:** How this platform addresses Cambodian financial literacy, digital payment integration (KHQR/Bakong), and modern software architecture.

---

## 🖥️ Slide-by-Slide Deck & Speaker Notes

### Slide 1: Title & Introduction
- **Slide Title:** ELMS — Next-Generation Fintech E-Learning Management System
- **Subtitle:** Empowering Cambodian Financial Inclusion through Scalable EdTech & Bakong KHQR
- **Visual:** Split screen showing the Web Platform (dark/light mode) and the Flutter Mobile App running side-by-side.
- **Presenter Script:**
  > *"Good morning Teacher Piseth and fellow classmates. Today, I am proud to present ELMS — a full-stack Fintech E-Learning Management System engineered specifically for the Cambodian banking and financial technology ecosystem. Our mission is to bridge the financial literacy gap by providing certified education on Bakong, KHQR, NBC regulations, and credit scoring on both web and mobile devices."*

---

### Slide 2: Problem Statement & Motivation
- **Slide Title:** The Gap in Cambodian Financial Education
- **Key Points:**
  1. **Rapid Fintech Adoption:** Cambodia has over 10M digital wallet users, yet formal education on payment infrastructure remains limited.
  2. **Bilingual Requirement:** High demand for authentic Khmer-language technical training alongside English.
  3. **Payment Friction:** Traditional course platforms rely on foreign credit cards (Stripe/PayPal), excluding Cambodian students who rely on KHQR and Bakong.
  4. **Network Challenges:** Students in rural provinces face intermittent 3G/4G bandwidth.
- **Presenter Script:**
  > *"Cambodia is experiencing an unprecedented digital payment boom led by the National Bank of Cambodia’s Bakong system. However, students, microfinance loan officers, and aspiring fintech developers lack dedicated educational platforms tailored to our local infrastructure. Furthermore, existing international platforms like Coursera or Udemy require foreign credit cards that most Cambodian students do not possess. ELMS solves all of these challenges."*

---

### Slide 3: Solution Architecture
- **Slide Title:** Modern Full-Stack System Architecture
- **Visual Diagram:**
  - **Client Tier:** React 18 (Vite, TypeScript, Tailwind) + Flutter 3.22 (BLoC, Material 3)
  - **API Gateway Tier:** Express.js + TypeScript (`/api/v1/...`), Helmet, Rate Limiters, OpenAPI
  - **Data Tier:** PostgreSQL 15 + Prisma ORM (Additive Migrations, Connection Pooling)
  - **Payment Rails:** KHQR Interoperable Gateway, Bakong Deeplinks, ABA PayWay
- **Presenter Script:**
  > *"Architecturally, ELMS is built following strict industry standards: a typed TypeScript backend using Prisma ORM on PostgreSQL, a high-performance React web console for instructors and admins, and a native Flutter mobile app for students on iOS and Android. All clients communicate with our unified `/api/v1` REST API, which is documented with interactive OpenAPI Swagger specifications."*

---

### Slide 4: Real-Product Cambodian Fintech Innovation
- **Slide Title:** Tailored for the Cambodian Financial Ecosystem
- **Key Features:**
  - **Official NBC Reference Rate:** Real-time dual-currency rendering (`1 USD = 4,100 KHR`).
  - **Interactive Cambodian Finance Hub:**
    1. Loan / EMI Reducing-Balance Amortization Calculator
    2. Compound Interest & Future Value Projection
    3. 50/30/20 Monthly Budgeting Planner (USD + KHR)
    4. USD ↔ KHR Bidirectional Converter
    5. Cambodian Fintech Glossary (KHQR, Bakong, NBC, CBC, AML/CFT)
- **Presenter Script:**
  > *"What truly differentiates ELMS from generic LMS platforms is our dedicated Cambodian Finance Hub. Students and practitioners can calculate reducing-balance EMI loan amortizations matching standard NBC formulas, plan their household budgets in both Riel and Dollars, and look up regulatory definitions like CAFIU AML laws and Credit Bureau Cambodia reporting."*

---

### Slide 5: Seamless KHQR Payment Experience
- **Slide Title:** Trustworthy National Digital Payments
- **Workflow Highlights:**
  - Instant dynamic KHQR code generation upon course checkout.
  - 5-minute security session countdown timer.
  - Automatic 3-second heartbeat status polling (`GET /api/v1/payments/:id`).
  - Sandbox test rail simulation for instant evaluation.
  - Idempotency key protection against duplicate payment charges.
- **Presenter Script:**
  > *"When a student purchases a course, the system immediately generates a standardized KHQR code. The student can scan it with Bakong, ABA, or any member banking app. The application features a 5-minute security countdown and automatically detects when the transaction settles in the background within 3 seconds, granting immediate enrollment access without requiring manual page refreshes."*

---

### Slide 6: Student Learning & Cryptographic Certificates
- **Slide Title:** High-Engagement Pedagogy & Public Verification
- **Key Highlights:**
  - **Video Player:** 0.75x–2.0x playback speed, auto-advance countdown banner, and timestamp-linked personal bookmarks.
  - **Sidecar Tools:** Slide-over calculator drawer inside lessons without interrupting video playback.
  - **Public QR Verification:** Every certificate contains an unforgeable QR code linking to `/verify/:certificateNumber` for public employer verification.
- **Presenter Script:**
  > *"Our video player features timestamped personal notes—clicking any note jumps the video directly to that exact second. Furthermore, upon course completion, students receive a verified certificate with a cryptographic QR code that employers or university registrars can scan to verify authenticity in real-time."*

---

### Slide 7: Academics, Grade Weighting & Rubrics
- **Slide Title:** Academic Integrity & Structured Evaluation
- **Key Highlights:**
  - **Grade Weighting (US-053):** Customizable categories (e.g. Quizzes 30%, Assignments 30%, Final 40%) validating to 100%.
  - **Rubric Builder & Grading (US-054):** Multi-level criteria (Exemplary, Proficient, Developing) with detailed student feedback.
  - **Timed Quizzes:** Dynamic timer with question-by-question rationales upon submission.
- **Presenter Script:**
  > *"For instructors, ELMS includes advanced academic tooling. Instructors can define grade weight distributions that must strictly equal 100%, and grade student submissions against interactive multi-criteria rubrics, providing full transparency to students."*

---

### Slide 8: User Experience, Dark Mode & Localization
- **Slide Title:** Production-Grade Design System & Accessibility
- **Key Highlights:**
  - **Bilingual Support (US-097):** Seamless instant toggling between English 🇺🇸 and authentic Khmer 🇰🇭 (`Kantumruy Pro` & `Battambang` typography).
  - **Fintech Theme:** Emerald-500 primary, Navy-900 slate neutrals, and Gold badges.
  - **Dark Mode:** System preference and manual toggle.
  - **Data Saver Mode:** Optimizes streaming bitrate for students on mobile network packages.
- **Presenter Script:**
  > *"We built a complete design system with dark mode and 4-state UI handling: loading skeletons, illustrated empty states, retryable error handling, and success notifications. Most importantly, the platform is 100% bilingual, allowing users to switch between English and authentic Khmer with one click."*

---

### Slide 9: Flutter Mobile Application
- **Slide Title:** Cross-Platform Student Mobile Experience
- **Key Highlights:**
  - Built with Flutter 3.22 and the BLoC state management pattern.
  - Complete 1:1 feature parity with web: courses, enrollments, KHQR checkout, and the 5 finance tools.
  - Verified static analysis (`flutter analyze` with 0 warnings) and 6 automated tests.
- **Presenter Script:**
  > *"On mobile, we developed a Flutter app targeting both iOS and Android. It consumes the same `/api/v1` backend, includes the complete Finance Hub, and allows students to complete their coursework on the go."*

---

### Slide 10: Security & Quality Assurance
- **Slide Title:** Security Hardening & Test Verification
- **Key Metrics:**
  - **OWASP Top 10 Audit:** Zero SQL injection risks via Prisma ORM, bcrypt password hashing (10+ rounds), and MIME file validation.
  - **Rate Limiting:** Dedicated brute-force protection on authentication and checkout routes.
  - **Automated Tests:**
    - Backend: 18 Vitest unit tests passing across 6 test suites.
    - Mobile: 6 Flutter automated unit & smoke tests passing.
    - Build: TypeScript 0 errors, Vite production build in ~4 seconds.
- **Presenter Script:**
  > *"Security was our highest priority. We performed a full OWASP Top 10 audit, implemented rate limiting on sensitive routes, and backed our business logic with 18 automated backend tests and 6 mobile unit tests."*

---

### Slide 11: Conclusion & Impact
- **Slide Title:** ELMS — Ready for Launch
- **Summary:**
  - Launch-ready full-stack product combining modern edtech with Cambodian fintech infrastructure.
  - Fully bilingual, multi-currency (USD/KHR), and mobile-first.
  - Clean codebase with 0 errors across TypeScript and Flutter.
- **Presenter Script:**
  > *"In conclusion, ELMS is not just a prototype; it is a launch-ready, secure, and polished educational system designed to support Cambodia's digital economy transition. Thank you, Teacher Piseth and classmates. I am now delighted to present a live demonstration!"*

---

## 🎬 Live Demo Checklist (5 Minutes)

Follow this sequence during the practical demo:
1. **Landing & Localization (1 min):**
   - Show homepage in Light Mode, toggle to Dark Mode.
   - Switch language to **🇰🇭 ភាសាខ្មែរ** to demonstrate font rendering and Khmer terms.
2. **Finance Hub (1.5 mins):**
   - Click **Finance Tools** (`/finance-tools`).
   - Run a quick Loan EMI calculation ($10,000, 12%, 24 months).
   - Show the 50/30/20 Budgeting breakdown with USD and KHR dual amounts.
3. **KHQR Checkout Flow (1.5 mins):**
   - Go to **Courses**, select a paid course, and click **Enroll**.
   - Select **KHQR** payment method: show 5:00 countdown timer.
   - Click **⚡ Simulate Success (Sandbox Demo)** to show automatic detection and instant enrollment.
4. **Learning Player & Certificate (1 min):**
   - Open a lesson, show timestamped notes and calculator slide-over drawer.
   - Navigate to **Certificate Verification** (`/verify/CERT-2026-001`) to show public QR verification.
