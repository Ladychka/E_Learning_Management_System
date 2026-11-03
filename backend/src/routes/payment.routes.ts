import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  checkout,
  confirmPayment,
  handlePaywayCallback,
  handleWebhook,
  getPaymentHistory,
  getPaymentById,
  getPaymentStatus,
  getPaymentQr,
  refundPayment,
  generateInvoice,
  getRevenueReport,
  getInstructorPayouts,
  processPayout,
  createCoupon,
  getCoupons,
  validateCoupon,
  createSubscriptionPlan,
  getSubscriptionPlans,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
} from "../controllers/payment.controller";
import {
  checkoutSchema,
  confirmPaymentSchema,
  refundSchema,
  couponSchema,
  validateCouponSchema,
} from "../validations/payment.schema";

export const paymentRouter = Router();

// ─── Static paths (must be registered before /:id routes) ───
paymentRouter.post("/checkout", authenticate, validate(checkoutSchema), checkout);
paymentRouter.get("/history", authenticate, getPaymentHistory);

// ─── Webhooks (public, signature verified in controller) ───
paymentRouter.post("/payway/callback", handlePaywayCallback);
paymentRouter.post("/webhook/:gateway", handleWebhook);

// ─── Revenue / Payouts ───
paymentRouter.get("/report/revenue", authenticate, authorize("ADMIN", "INSTRUCTOR"), getRevenueReport);
paymentRouter.get("/payouts", authenticate, authorize("ADMIN", "INSTRUCTOR"), getInstructorPayouts);
paymentRouter.post("/payouts/:id/process", authenticate, authorize("ADMIN"), processPayout);

// ─── Coupons ───
paymentRouter.post("/coupons/validate", authenticate, validate(validateCouponSchema), validateCoupon);
paymentRouter.post("/coupons", authenticate, authorize("ADMIN"), validate(couponSchema), createCoupon);
paymentRouter.get("/coupons", authenticate, authorize("ADMIN"), getCoupons);

// ─── Subscription Plans ───
paymentRouter.get("/subscriptions", getSubscriptionPlans);
paymentRouter.post("/subscriptions", authenticate, authorize("ADMIN"), createSubscriptionPlan);
paymentRouter.patch("/subscriptions/:id", authenticate, authorize("ADMIN"), updateSubscriptionPlan);
paymentRouter.delete("/subscriptions/:id", authenticate, authorize("ADMIN"), deleteSubscriptionPlan);

// ─── Single payment routes ───
paymentRouter.post("/:id/confirm", authenticate, validate(confirmPaymentSchema), confirmPayment);
paymentRouter.get("/:id/status", authenticate, getPaymentStatus);
paymentRouter.get("/:id/qr", authenticate, getPaymentQr);
paymentRouter.get("/:id/invoice", authenticate, generateInvoice);
paymentRouter.post("/:id/refund", authenticate, authorize("ADMIN"), validate(refundSchema), refundPayment);
paymentRouter.get("/:id", authenticate, getPaymentById);
