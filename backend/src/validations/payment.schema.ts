import { z } from "zod";

export const checkoutSchema = z.object({
  courseId: z.string().uuid().optional(),
  subscriptionId: z.string().uuid().optional(),
  gateway: z.enum(["khqr", "aba_payway", "bakong"]),
  couponCode: z.string().optional(),
});

export const confirmPaymentSchema = z.object({
  gatewayRef: z.string().min(1),
  status: z.enum(["completed", "failed"]),
});

export const refundSchema = z.object({
  reason: z.string().min(5),
});

export const couponSchema = z.object({
  code: z.string().min(3),
  description: z.string().optional(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().min(0),
  maxUses: z.number().int().min(1).optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime().optional(),
  courseId: z.string().uuid().optional(),
});

export const validateCouponSchema = z.object({
  code: z.string().min(1),
  courseId: z.string().uuid().optional(),
});
