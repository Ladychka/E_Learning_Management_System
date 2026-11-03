# ELMS — Evaluator & Demo Presentation Script (5-Minute Tour)

Use this script to showcase the finished **Fintech E-Learning Management System (ELMS)** to faculty, teachers, stakeholders, or technical interviewers.

---

## Act 1: The Landing & Bilingual Experience (0:00 - 1:00)

1. Open Web Console: `http://localhost:5173`
2. **Showcase Theme & Localization:**
   - Click the **Language Toggle** in the top navigation bar (`EN` ↔ `KM ខ្មែរ`).
   - Notice the authentic Khmer typography (`Kantumruy Pro` / `Battambang`) rendering across all headings and cards.
   - Click the **Dark Mode** sun/moon toggle to showcase the dark mode styling.
3. **Explore Courses Catalog:**
   - Filter by **Price: Paid / Free** and Sort by **Popularity**.
   - Point out the dual currency pricing badges: `$25.00 (≈ 102,500 ៛)`.

---

## Act 2: Interactive Cambodian Finance Hub (1:00 - 2:00)

1. Navigate to **Finance Tools** (`/finance-tools`) on Web or Mobile:
   - **Loan / EMI Amortization:** Enter `$10,000`, `12%` interest, `24 months`. Showcase the monthly payment and principal-vs-interest distribution.
   - **50/30/20 Budgeting:** Enter `$800` monthly income. Point out the instant allocation into Needs ($400), Wants ($240), and Savings ($160) with Cambodian Riel equivalents.
   - **Live Currency Converter:** Type `$100` to convert to `410,000 ៛` at the NBC official benchmark rate.
   - **Fintech Glossary:** Search for `KHQR` or `Bakong` to inspect authentic definitions in English and Khmer.

---

## Act 3: KHQR Payment & Fast Enrollment (2:00 - 3:00)

1. Click on a paid course (e.g., *Cambodian Digital Banking Architecture & KHQR*).
2. Click **Enroll Now** → Proceed to Checkout.
3. Select **KHQR**:
   - Observe the 5-minute security countdown timer.
   - Point out the polling heartbeat indicator waiting for bank response.
   - Click **Simulate Success (Sandbox Demo)**.
4. Watch the modal transition directly to **Enrollment Successful**!

---

## Act 4: Learning Experience & Public QR Certificates (3:00 - 4:00)

1. Open the enrolled course in the **Lesson Player**:
   - Change playback speed (`1.5x`).
   - Click **Take Note** at `0:15` to capture a note. Fast-forward the video and click the note to jump back to `0:15`.
   - Open the **Slide-over Calculator Drawer** without leaving the video.
2. Open **My Enrollments** → Click **View Certificate**:
   - Show the verified certificate with its dynamic QR code.
   - Click the QR code link to open the public verification view at `/verify/:certificateNumber`.
   - Show the print-ready CSS layout.

---

## Act 5: Administrative Control & Mobile App Parity (4:00 - 5:00)

1. Sign in as Admin (`admin@elms.edu.kh` / `Password123!`):
   - Open **Audit Logs** (`/admin/audit-logs`) to show full mutation tracking.
   - Open **Interactive API Docs** at `http://localhost:5000/api/docs` (Swagger UI).
2. Open Flutter Mobile App:
   - Show the bottom navigation with the central **Finance Hub** tab.
   - Switch language to **ភាសាខ្មែរ KM** in Profile.
   - Run `flutter test` in terminal to confirm 6/6 tests passing.
3. Conclude the demonstration.
