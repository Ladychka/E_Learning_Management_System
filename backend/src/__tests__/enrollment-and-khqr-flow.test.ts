import { describe, it, expect } from "vitest";

describe("Enrollment & KHQR Payment Flow Tests", () => {
  const NBC_RATE = 4100.0;

  // ─── 1. Free Course Direct Enrollment Tests ───
  describe("Free Course Direct Enrollment (Introduction to Digital Finance in Cambodia)", () => {
    it("allows direct enrollment for free course without requiring payment", () => {
      const freeCourse = {
        id: "c-free-001",
        title: "Introduction to Digital Finance in Cambodia (Free)",
        slug: "intro-to-digital-finance-cambodia-free",
        price: 0.0,
        isFree: true,
      };

      function evaluateEnrollmentEligibility(course: typeof freeCourse, userPayments: { courseId: string; status: string }[]) {
        const isFree = course.isFree || !course.price || Number(course.price) === 0;
        if (isFree) {
          return { allowed: true, requiresPayment: false, status: "active" };
        }
        const hasPaid = userPayments.some((p) => p.courseId === course.id && p.status === "completed");
        if (!hasPaid) {
          return { allowed: false, requiresPayment: true, error: "Payment required" };
        }
        return { allowed: true, requiresPayment: false, status: "active" };
      }

      // Free course without any payment history
      const result = evaluateEnrollmentEligibility(freeCourse, []);
      expect(result.allowed).toBe(true);
      expect(result.requiresPayment).toBe(false);
      expect(result.status).toBe("active");
    });

    it("rejects direct self-enrollment for paid courses if payment is not completed", () => {
      const paidCourse = {
        id: "c-paid-002",
        title: "KHQR Payment Test Course",
        slug: "khqr-payment-test-course",
        price: 0.1,
        isFree: false,
      };

      function evaluateEnrollmentEligibility(course: typeof paidCourse, userPayments: { courseId: string; status: string }[]) {
        const isFree = course.isFree || !course.price || Number(course.price) === 0;
        if (isFree) {
          return { allowed: true, requiresPayment: false };
        }
        const hasPaid = userPayments.some((p) => p.courseId === course.id && p.status === "completed");
        if (!hasPaid) {
          return { allowed: false, requiresPayment: true, error: "Payment required" };
        }
        return { allowed: true, requiresPayment: false };
      }

      // No payment: blocked
      const blocked = evaluateEnrollmentEligibility(paidCourse, []);
      expect(blocked.allowed).toBe(false);
      expect(blocked.requiresPayment).toBe(true);

      // Pending payment: still blocked
      const pending = evaluateEnrollmentEligibility(paidCourse, [{ courseId: "c-paid-002", status: "pending" }]);
      expect(pending.allowed).toBe(false);
      expect(pending.requiresPayment).toBe(true);

      // Completed payment: allowed
      const allowed = evaluateEnrollmentEligibility(paidCourse, [{ courseId: "c-paid-002", status: "completed" }]);
      expect(allowed.allowed).toBe(true);
      expect(allowed.requiresPayment).toBe(false);
    });
  });

  // ─── 2. KHQR Checkout for 0.10 USD (≈ 410 KHR) ───
  describe("KHQR Payment Test Course ($0.10 USD)", () => {
    it("stores price as 0.10 Decimal and converts to exact 410 KHR", () => {
      const priceUsd = 0.1;
      const khrAmount = Math.round(priceUsd * NBC_RATE);

      expect(khrAmount).toBe(410);
    });

    it("formats 0.10 USD price consistently as $0.10 instead of $0.1", () => {
      const priceUsd = 0.1;
      const formattedUsd = `$${priceUsd.toFixed(2)}`;
      const formattedKhr = `${Math.round(priceUsd * NBC_RATE).toLocaleString()} ៛`;
      const dualDisplay = `${formattedUsd} (≈ ${formattedKhr})`;

      expect(formattedUsd).toBe("$0.10");
      expect(formattedUsd).not.toBe("$0.1");
      expect(dualDisplay).toBe("$0.10 (≈ 410 ៛)");
    });

    it("generates correct KHQR sandbox payment payload for 0.10 USD", () => {
      const course = {
        id: "c-paid-002",
        title: "KHQR Payment Test Course",
        price: 0.1,
        currency: "USD",
      };

      function createKhqrCheckout(c: typeof course, gateway: string, gatewayRef: string) {
        const finalAmount = Number(c.price.toFixed(2));
        const khrAmount = Math.round(finalAmount * NBC_RATE);
        const qrData = `https://sandbox.khqr.gov.kh/pay/${gatewayRef}`;
        const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;

        return {
          payment: {
            amount: finalAmount,
            currency: c.currency,
            status: "pending",
            gateway,
            gatewayRef,
          },
          checkout: {
            amount: finalAmount,
            amountKhr: khrAmount,
            currency: c.currency,
            status: "pending",
            gateway,
            qrData,
            qrImage,
            expiresInSeconds: 300, // 5:00 minutes
            pollIntervalSeconds: 3, // 3-second auto-poll
          },
        };
      }

      const checkout = createKhqrCheckout(course, "khqr", "KHQR-TEST-001");
      expect(checkout.payment.amount).toBe(0.1);
      expect(checkout.payment.amount.toFixed(2)).toBe("0.10");
      expect(checkout.checkout.amountKhr).toBe(410);
      expect(checkout.checkout.expiresInSeconds).toBe(300);
      expect(checkout.checkout.pollIntervalSeconds).toBe(3);
      expect(checkout.checkout.qrData).toContain("sandbox.khqr.gov.kh/pay/KHQR-TEST-001");
    });
  });

  // ─── 3. Idempotency Key Handling on Checkout ───
  describe("Idempotency Key Handling for 0.10 USD Checkout", () => {
    it("returns existing pending payment on identical idempotency key without duplicate creation", () => {
      const activePayments: Map<string, { id: string; amount: number; idempotencyKey: string; status: string; createdAt: number }> = new Map();

      function checkoutWithIdempotency(_userId: string, _courseId: string, amount: number, idempotencyKey?: string) {
        if (idempotencyKey) {
          for (const p of activePayments.values()) {
            if (p.idempotencyKey === idempotencyKey && p.status === "pending" && Date.now() - p.createdAt < 15 * 60 * 1000) {
              return { isNew: false, payment: p };
            }
          }
        }

        const newPayment = {
          id: `pay-${Math.random().toString(36).substring(2, 9)}`,
          amount,
          idempotencyKey: idempotencyKey || "",
          status: "pending",
          createdAt: Date.now(),
        };
        activePayments.set(newPayment.id, newPayment);
        return { isNew: true, payment: newPayment };
      }

      const key = "idem-key-checkout-010-usd";
      const call1 = checkoutWithIdempotency("user-1", "c-paid-002", 0.1, key);
      expect(call1.isNew).toBe(true);
      expect(call1.payment.amount).toBe(0.1);

      // Repeat request with same idempotency key
      const call2 = checkoutWithIdempotency("user-1", "c-paid-002", 0.1, key);
      expect(call2.isNew).toBe(false);
      expect(call2.payment.id).toBe(call1.payment.id);
      expect(call2.payment.amount).toBe(0.1);
      expect(activePayments.size).toBe(1);
    });
  });

  // ─── 4. Simulation & Confirmation Flow ───
  describe("Sandbox Payment Confirmation Flow", () => {
    it("activates active enrollment immediately when sandbox simulation succeeds", () => {
      const db = {
        payments: new Map<string, { id: string; status: string; paidAt?: Date }>(),
        enrollments: new Map<string, { userId: string; courseId: string; status: string }>(),
      };

      const paymentId = "pay-010-test";
      db.payments.set(paymentId, { id: paymentId, status: "pending" });

      function confirmSandboxPayment(pid: string, userId: string, courseId: string) {
        const payment = db.payments.get(pid);
        if (!payment) throw new Error("Payment not found");
        payment.status = "completed";
        payment.paidAt = new Date();

        // Auto-enroll
        db.enrollments.set(`${userId}_${courseId}`, {
          userId,
          courseId,
          status: "active",
        });

        return { payment, enrollment: db.enrollments.get(`${userId}_${courseId}`) };
      }

      const result = confirmSandboxPayment(paymentId, "user-student-1", "c-paid-002");
      expect(result.payment.status).toBe("completed");
      expect(result.enrollment?.status).toBe("active");
    });
  });
});
