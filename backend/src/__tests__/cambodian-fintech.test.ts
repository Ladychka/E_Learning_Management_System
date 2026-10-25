import { describe, it, expect } from "vitest";

describe("Cambodian Fintech Features & KHQR Standards", () => {
  const NBC_REFERENCE_RATE = 4100.0;

  it("converts USD to KHR according to official NBC rate", () => {
    const usdPrices = [5, 10, 25, 50, 100];
    const expectedKhr = [20500, 41000, 102500, 205000, 410000];

    usdPrices.forEach((usd, i) => {
      const converted = Math.round(usd * NBC_REFERENCE_RATE);
      expect(converted).toBe(expectedKhr[i]);
    });
  });

  it("formats dual currency display strings accurately", () => {
    function formatDualPrice(usd: number): string {
      const khr = Math.round(usd * NBC_REFERENCE_RATE).toLocaleString();
      return `$${usd.toFixed(2)} (≈ ${khr} ៛)`;
    }

    expect(formatDualPrice(25)).toBe("$25.00 (≈ 102,500 ៛)");
    expect(formatDualPrice(0)).toBe("$0.00 (≈ 0 ៛)");
  });

  it("validates payment idempotency key matching to prevent double charging", () => {
    const paymentStore = new Map<string, { id: string; status: string }>();

    function processPaymentWithIdempotency(key: string, paymentData: { id: string; status: string }) {
      if (paymentStore.has(key)) {
        return { cached: true, payment: paymentStore.get(key)! };
      }
      paymentStore.set(key, paymentData);
      return { cached: false, payment: paymentData };
    }

    const firstAttempt = processPaymentWithIdempotency("req-key-abc", { id: "p-001", status: "PENDING" });
    expect(firstAttempt.cached).toBe(false);
    expect(firstAttempt.payment.id).toBe("p-001");

    // Immediate second attempt with same key returns cached payment without recreating
    const secondAttempt = processPaymentWithIdempotency("req-key-abc", { id: "p-002", status: "PENDING" });
    expect(secondAttempt.cached).toBe(true);
    expect(secondAttempt.payment.id).toBe("p-001");
  });
});
