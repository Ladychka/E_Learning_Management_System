# ELMS — Cambodian Payment Rails & KHQR Integration

This document outlines the architecture, standards, and workflow for payment processing within the ELMS platform.

---

## 1. Supported Cambodian Payment Rails

1. **KHQR (Standardized Cambodian QR Code):**
   - Issued in accordance with the National Bank of Cambodia (NBC) KHQR specification.
   - Operates across all NBC Bakong-connected financial institutions (ABA, Wing, ACLEDA, Sathapana, Canadia, etc.).
   - Dual currency support: **USD** and **KHR** (Cambodian Riel).
2. **ABA PayWay Gateway:**
   - Redirect / webview integration for ABA Mobile users and Visa/Mastercard credit/debit card processing.
3. **Bakong Wallet Deeplink:**
   - Instant mobile-to-mobile app switching to the Bakong application.

---

## 2. KHQR Checkout Lifecycle

```
[Student Device]                 [ELMS Backend]             [NBC / Banking App]
       │                                │                               │
       │── 1. POST /payments/checkout ─▶│                               │
       │   (courseId, gateway='khqr')   │── 2. Create Payment Record   ─│
       │                                │   & Generate KHQR Payload     │
       │◀─ 3. Return QR image & id ─────│                               │
       │                                │                               │
       │   [5-Minute Countdown Starts]  │                               │
       │── 4. Scan QR Image ───────────────────────────────────────────▶│
       │                                │                               │
       │                                │◀── 5. Payment Notification ───│
       │── 6. Poll GET /payments/:id ──▶│                               │
       │◀─ 7. Status: COMPLETED ────────│                               │
       │                                │                               │
       │   [Auto-redirect to Course]    │── 8. Activate Enrollment ─────│
```

---

## 3. Real-Time Conversion & Exchange Rate Benchmark

All financial models within ELMS adhere to the NBC official exchange rate benchmark:
- **Baseline Exchange Rate:** `1 USD = 4,100 KHR`
- Every course pricing card, checkout invoice, and budgeting calculator displays both currencies side-by-side:
  - Example: `$25.00 (≈ 102,500 ៛)`
  - Avoids fractional Riel units by rounding to the nearest whole integer.

---

## 4. Sandbox Testing & Evaluation Simulation

To facilitate testing without requiring live banking credentials, ELMS provides a dedicated sandbox simulation endpoint:
- **Endpoint:** `POST /api/v1/payments/:id/confirm`
- **Payload:**
  ```json
  {
    "gatewayRef": "SANDBOX-APP-1729837200000",
    "status": "completed"
  }
  ```
- **UI Trigger:**
  - On the Web checkout modal: Click **⚡ Simulate Success (Sandbox Demo)**.
  - On the Mobile checkout screen: Tap **⚡ Simulate Success (Sandbox Demo)**.
  - The payment transitions from `PENDING` to `COMPLETED` immediately and grants course enrollment access.

---

## 5. Revenue Sharing & Payouts

- **Standard Platform Split:** 70% to the Course Author / Instructor, 30% to the ELMS Platform.
- Payout ledger records accrue in the database with every successful payment transaction.
- Administrators can review accrued earnings and process batch payouts via `/admin/reports` → **Instructor Payouts**.
