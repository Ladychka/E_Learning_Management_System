# ELMS — Evaluation Defense & Teacher Q&A Cheat Sheet
**Subject:** Financial Application Design (Teacher Piseth)

Here are the most critical questions Teacher Piseth or evaluators may ask, along with the exact technical and architectural answers you should give.

---

### Q1: "How does your KHQR payment integration work technically without a live merchant bank agreement?"
**Answer:**
> *"We implemented the official National Bank of Cambodia (NBC) KHQR specification. When a student initiates checkout, the backend creates a unique pending transaction record with an expiration timestamp of 5 minutes. The backend encodes the payload according to EMVCo standard tags (Payload Format Indicator, Point of Initiation Method, Merchant Category Code, Currency 116 for KHR / 840 for USD, and CRC-16 checksum). In our evaluation environment, we provide a secure Sandbox simulation webhook (`POST /api/v1/payments/:id/confirm`) which simulates the callback from the Bakong settlement switch. On the client side, both Web and Mobile apps use a 3-second heartbeat polling mechanism to detect settlement and immediately activate course enrollment."*

---

### Q2: "Why did you implement a 50/30/20 budget and loan amortization calculator inside an LMS?"
**Answer:**
> *"Financial Application Design requires that educational concepts be immediately applicable. Rather than merely teaching financial formulas through static text or video slides, ELMS embeds interactive computational tools directly into the learning experience. Students taking courses on microfinance lending or household wealth management can compute real-world EMI reducing-balance schedules and budget distributions in both USD and Cambodian Riel using the official 4,100 KHR benchmark rate. We also provide this tool inside a slide-over drawer within the lesson video player so students don't need to leave their lecture to verify computations."*

---

### Q3: "How is security handled, especially regarding user authentication and video asset protection?"
**Answer:**
> *"We follow the OWASP Top 10 guidelines documented in `docs/SECURITY.md`:
> 1. Passwords are salted and hashed using bcrypt with at least 10 rounds.
> 2. We use a dual-token JWT architecture with short-lived access tokens (15 minutes) and rotating refresh tokens (7 days).
> 3. Sensitive routes such as `/api/v1/auth/login` and `/api/v1/payments/checkout` are protected by dedicated rate limiters to prevent brute-force and payment flooding attacks.
> 4. Video streams and PDF lesson files are served with strict Content-Disposition headers and verified through authentication middleware rather than raw public cloud bucket URLs."*

---

### Q4: "How did you implement bilingual support (Khmer and English)?"
**Answer:**
> *"On the Web frontend, we integrated `i18next` and `react-i18next` with localized JSON translation dictionaries (`en.json` and `km.json`). When the user selects Khmer, the root document dynamically applies authentic Cambodian typography classes (`font-khmer` using Google Fonts Kantumruy Pro and Battambang). On the Flutter mobile app, we utilized `flutter_localizations` alongside a custom `LocaleCubit` that persists the student's language preference in `SharedPreferences`, ensuring zero flickering across app relaunches."*

---

### Q5: "How does the mobile app maintain state and synchronize with the web backend?"
**Answer:**
> *"The Flutter mobile app uses the BLoC (Business Logic Component) and Cubit architecture, which cleanly separates UI from business logic. State is divided into distinct domains: `AuthCubit`, `CourseCubit`, `EnrollmentCubit`, `QuizCubit`, and `LocaleCubit`. Both web and mobile clients consume the exact same versioned `/api/v1` RESTful backend via Dio on mobile and Axios on web. This guarantees 100% data consistency across enrollments, quiz attempts, and payment history."*

---

### Q6: "How do you verify certificate authenticity and prevent forgery?"
**Answer:**
> *"Every issued certificate generates an immutable record in our PostgreSQL database containing a unique certificate number (e.g. `CERT-2026-001`), student ID, course ID, issue timestamp, and a cryptographic verification URL. The certificate UI renders a QR code pointing to `/verify/:certificateNumber`. Any employer, recruiter, or third party can scan the QR code with their mobile phone camera to view the live verification page without needing to log in."*
