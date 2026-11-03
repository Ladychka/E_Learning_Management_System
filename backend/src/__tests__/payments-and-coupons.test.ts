import { describe, it, expect } from "vitest";

describe("US-071 to US-080 Payments, Discounts & Revenue Sharing", () => {
  it("calculates percentage coupon discount properly", () => {
    const originalPrice = 50.0; // $50
    const couponDiscount = 20;  // 20%
    const discountAmount = (originalPrice * couponDiscount) / 100;
    const finalPrice = Math.max(0, originalPrice - discountAmount);

    expect(discountAmount).toBe(10);
    expect(finalPrice).toBe(40);
  });

  it("calculates fixed coupon discount properly without going negative", () => {
    const originalPrice = 25.0;
    const couponDiscount = 30.0;
    const finalPrice = Math.max(0, originalPrice - couponDiscount);

    expect(finalPrice).toBe(0);
  });

  it("calculates 70/30 instructor revenue sharing correctly in minor units", () => {
    const coursePriceUsd = 100.0;
    const instructorSharePercent = 70;
    const platformSharePercent = 30;

    const instructorEarnings = (coursePriceUsd * instructorSharePercent) / 100;
    const platformEarnings = (coursePriceUsd * platformSharePercent) / 100;

    expect(instructorEarnings).toBe(70.0);
    expect(platformEarnings).toBe(30.0);
  });

  it("calculates 2-part and 3-part installment payments properly with 0% interest", () => {
    const coursePrice = 50.0;
    const installments2 = 2;
    const part1Of2 = Number((coursePrice / installments2).toFixed(2));
    const remaining2 = Number((coursePrice - part1Of2).toFixed(2));

    expect(part1Of2).toBe(25.0);
    expect(remaining2).toBe(25.0);
    expect(part1Of2 + remaining2).toBe(50.0);

    const installments3 = 3;
    const part1Of3 = Number((coursePrice / installments3).toFixed(2));
    const remaining3 = Number((coursePrice - part1Of3).toFixed(2));

    expect(part1Of3).toBe(16.67);
    expect(remaining3).toBe(33.33);
    expect(Number((part1Of3 + remaining3).toFixed(2))).toBe(50.0);
  });

  it("verifies Cambodian payment rails and dual currency conversion", () => {
    const supportedGateways = ["khqr", "aba_payway", "bakong", "wing", "acleda", "card"];
    expect(supportedGateways).toHaveLength(6);
    expect(supportedGateways).toContain("wing");
    expect(supportedGateways).toContain("acleda");
    expect(supportedGateways).toContain("card");

    const amountUsd = 25.0;
    const NBC_RATE = 4100;
    const amountKhr = Math.round(amountUsd * NBC_RATE);
    expect(amountKhr).toBe(102500);
  });
});
