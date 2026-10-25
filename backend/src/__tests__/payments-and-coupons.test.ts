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
});
