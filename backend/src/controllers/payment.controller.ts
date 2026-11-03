import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "../utils/audit";
import { config } from "../config";
import {
  buildPaywayCheckout,
  checkPaywayTransaction,
  isPaywayConfigured,
  verifyPaywaySignature,
} from "../lib/payway";
import { getStaticPaymentQr } from "../lib/static-payment-qr";

// ─── Helpers ───

function generateGatewayRef(gateway: string): string {
  const prefix = gateway.toUpperCase().replace(/_/g, "-");
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateInvoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${y}${m}-${seq}`;
}

const NBC_EXCHANGE_RATE = 4100;
const PAYMENT_EXPIRY_MS = 5 * 60 * 1000;

function paymentExpiresAt(payment: { createdAt: Date }): Date {
  return new Date(payment.createdAt.getTime() + PAYMENT_EXPIRY_MS);
}

/** Converts any supported payment amount into USD for reporting/payouts. */
function toUsd(amount: number, currency: string): number {
  return String(currency).toUpperCase() === "KHR"
    ? amount / NBC_EXCHANGE_RATE
    : amount;
}

async function calculateRevenueShare(_courseId: string, amountUsd: number): Promise<number> {
  // Default: instructor gets 70%
  const settings = await prisma.setting.findUnique({ where: { key: "instructor_revenue_share" } });
  const sharePercent = settings ? parseFloat(settings.value) : 70;
  return Number(((amountUsd * sharePercent) / 100).toFixed(2));
}

async function createInstructorPayout(
  courseId: string,
  paymentId: string,
  amount: number,
  currency: string
) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });
  if (!course) return;

  // Callback retries must not create duplicate payouts for one payment.
  const existingPayout = await prisma.instructorPayout.findFirst({
    where: { notes: { contains: `payment ${paymentId}` } },
    select: { id: true },
  });
  if (existingPayout) return;

  // Payouts are always recorded in USD; converting here prevents KHR amounts
  // (e.g. 205,000 KHR) being stored as 205,000 USD.
  const amountUsd = toUsd(amount, currency);
  const revenue = await calculateRevenueShare(courseId, amountUsd);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  await prisma.instructorPayout.create({
    data: {
      instructorId: course.instructorId,
      amount: revenue,
      currency: "USD",
      status: "pending",
      periodStart: startOfMonth,
      periodEnd: endOfMonth,
      notes: `Auto-generated from payment ${paymentId}`,
    },
  });
}

interface PaymentForEnrollment {
  id: string;
  userId: string;
  courseId: string | null;
  amount: unknown;
  currency: string;
  metadata: unknown;
}

/**
 * Resolves the course access balance in USD and returns whether the student
 * has now paid the full course price. Installment plans unlock course access
 * on the first confirmed part; the balance is still tracked for payouts.
 */
async function activateEnrollmentIfFullyPaid(payment: PaymentForEnrollment): Promise<boolean> {
  if (!payment.courseId) return false;

  const metadata = (payment.metadata as Record<string, unknown> | null) || {};
  let requiredAmount = Number(metadata.fullCoursePrice ?? 0);
  let requiredCurrency = payment.currency;
  if (!requiredAmount) {
    const course = await prisma.course.findUnique({
      where: { id: payment.courseId },
      select: { price: true, currency: true },
    });
    requiredAmount = course?.price ? Number(course.price) : Number(payment.amount);
    requiredCurrency = course?.currency || payment.currency;
  }

  const confirmed = await prisma.payment.findMany({
    where: {
      userId: payment.userId,
      courseId: payment.courseId,
      status: "completed",
    },
    select: { amount: true, currency: true },
  });
  // Normalize all payments to USD so mixed USD/KHR plans reconcile correctly.
  const paidAmount = confirmed.reduce(
    (sum, item) => sum + toUsd(Number(item.amount), item.currency),
    0
  );
  const requiredAmountUsd = toUsd(requiredAmount, requiredCurrency);
  const tolerance = 0.01;
  const fullyPaid = paidAmount + tolerance >= requiredAmountUsd;

  const isInstallmentPlan =
    metadata.paymentPlan === "installment" || metadata.paymentPlan === "balance";

  // The product promises immediate access after the first installment part.
  if (!fullyPaid && !isInstallmentPlan) return false;

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: payment.userId, courseId: payment.courseId } },
    create: { userId: payment.userId, courseId: payment.courseId, status: "active", enrolledBy: payment.userId },
    update: { status: "active" },
  });

  // Only pay out the instructor once the whole balance has been collected.
  if (fullyPaid) {
    await createInstructorPayout(payment.courseId, payment.id, requiredAmountUsd, "USD");
  }
  return fullyPaid;
}

/**
 * Atomically moves a payment to completed and activates the enrollment. The
 * conditional update makes callback retries idempotent: only the first caller
 * can transition the row, so payouts and enrollment activation happen once.
 */
async function finalizePaymentCompleted(paymentId: string) {
  const result = await prisma.payment.updateMany({
    where: {
      id: paymentId,
      status: { notIn: ["completed", "refunded"] },
    },
    data: { status: "completed", paidAt: new Date() },
  });

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { course: true },
  });

  let enrolled = false;
  if (payment?.courseId && (result.count > 0 || payment.status === "completed")) {
    enrolled = await activateEnrollmentIfFullyPaid(payment);
  }

  return { changed: result.count > 0, enrolled, payment };
}

async function markPaymentStatus(paymentId: string, status: string) {
  return prisma.payment.updateMany({
    where: {
      id: paymentId,
      status: { notIn: ["completed", "refunded"] },
    },
    data: { status },
  });
}

async function checkProviderPaymentStatus(payment: {
  id: string;
  status: string;
  gateway: string;
  gatewayRef: string | null;
}) {
  if (payment.status !== "pending" || !payment.gatewayRef) {
    return { checked: false, providerStatus: null as string | null };
  }

  const canCheckWithPayway =
    ["khqr", "aba_payway", "card"].includes(payment.gateway) &&
    isPaywayConfigured();

  if (!canCheckWithPayway) {
    return { checked: false, providerStatus: null as string | null };
  }

  const result = await checkPaywayTransaction(payment.gatewayRef);
  if (!result) {
    return { checked: false, providerStatus: null as string | null };
  }

  if (result.status === "paid") {
    await finalizePaymentCompleted(payment.id);
  } else if (result.status === "failed") {
    await markPaymentStatus(payment.id, "failed");
  }

  return {
    checked: true,
    providerStatus: result.status,
  };
}

async function applyCoupon(
  couponCode: string,
  amount: number,
  courseId?: string
): Promise<{ discountAmount: number; finalAmount: number; couponId: string | null }> {
  const normalizedCode = couponCode.trim().toUpperCase();
  const coupon = await prisma.coupon.findUnique({ where: { code: normalizedCode } });
  if (!coupon || !coupon.isActive) {
    return { discountAmount: 0, finalAmount: amount, couponId: null };
  }

  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) {
    return { discountAmount: 0, finalAmount: amount, couponId: null };
  }
  if (coupon.validUntil && now > coupon.validUntil) {
    return { discountAmount: 0, finalAmount: amount, couponId: null };
  }
  if (coupon.maxUses && coupon.usesCount >= coupon.maxUses) {
    return { discountAmount: 0, finalAmount: amount, couponId: null };
  }
  if (coupon.courseId && coupon.courseId !== courseId) {
    return { discountAmount: 0, finalAmount: amount, couponId: null };
  }

  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    discountAmount = Number(((amount * Number(coupon.discountValue)) / 100).toFixed(2));
  } else {
    discountAmount = Number(coupon.discountValue);
  }
  discountAmount = Math.min(discountAmount, amount);
  const finalAmount = Number((amount - discountAmount).toFixed(2));

  // Usage is incremented only after a payment is actually created, so retries
  // and idempotent replays do not burn coupon usage.
  return { discountAmount, finalAmount, couponId: coupon.id };
}

// ─── Controllers ───

export const checkout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      courseId,
      subscriptionId,
      gateway,
      couponCode,
      paymentPlan = "full",
      installments = 2,
      currency: requestedCurrency,
    } = req.body;
    const userId = req.user!.id;

    if (!courseId && !subscriptionId) {
      throw new AppError("Either courseId or subscriptionId is required", 400);
    }

    let amount = 0;
    let amountCurrency = "USD";
    let currency = requestedCurrency || "USD";
    let targetCourseId: string | null = courseId || null;

    if (courseId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);
      const course = await prisma.course.findFirst({
        where: isUuid ? { OR: [{ id: courseId }, { slug: courseId }] } : { slug: courseId },
      });
      if (!course) throw new AppError("Course not found", 404);
      if (course.status !== "PUBLISHED") {
        throw new AppError("Course is not available for purchase", 400);
      }
      targetCourseId = course.id;
      amount = course.price ? Number(course.price) : 0;
      amountCurrency = course.currency || "USD";
      currency = requestedCurrency || amountCurrency;
      if (course.isFree) amount = 0;
    }

    if (subscriptionId) {
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: subscriptionId } });
      if (!plan) throw new AppError("Subscription plan not found", 404);
      if (!plan.isActive) throw new AppError("Subscription plan is not active", 400);
      amount = Number(plan.price);
      amountCurrency = plan.currency;
      currency = requestedCurrency || plan.currency;
    }

    // Apply coupon if provided
    let discountAmount = 0;
    let finalAmount = amount;
    let appliedCouponId: string | null = null;
    if (couponCode && amount > 0) {
      const couponResult = await applyCoupon(couponCode, amount, targetCourseId || undefined);
      discountAmount = couponResult.discountAmount;
      finalAmount = couponResult.finalAmount;
      appliedCouponId = couponResult.couponId;
    }

    // Convert the course price from its own currency into the currency the
    // student chose to pay with, using the NBC benchmark rate.
    const nbcRate = NBC_EXCHANGE_RATE;
    const amountCurrencyUpper = String(amountCurrency).toUpperCase();
    const paymentCurrencyUpper = String(currency).toUpperCase();
    let fullChargeAmount: number;
    if (amountCurrencyUpper === paymentCurrencyUpper) {
      fullChargeAmount = finalAmount;
    } else if (amountCurrencyUpper === "USD" && paymentCurrencyUpper === "KHR") {
      fullChargeAmount = Math.round(finalAmount * nbcRate);
    } else if (amountCurrencyUpper === "KHR" && paymentCurrencyUpper === "USD") {
      fullChargeAmount = Number((finalAmount / nbcRate).toFixed(2));
    } else {
      fullChargeAmount = finalAmount;
    }

    // If the student already paid part of this course, only charge the balance.
    let alreadyPaid = 0;
    let previousPaymentsCount = 0;
    let previousTotalInstallments = 0;
    if (targetCourseId) {
      const earlierPayments = await prisma.payment.findMany({
        where: {
          userId,
          courseId: targetCourseId,
          status: "completed",
        },
        select: { amount: true, currency: true },
        orderBy: { createdAt: "asc" },
      });
      // Normalize earlier payments into the requested payment currency so a
      // student who switches between USD and KHR is not double charged.
      alreadyPaid = earlierPayments.reduce((sum, item) => {
        const usd = toUsd(Number(item.amount), item.currency);
        return sum + (paymentCurrencyUpper === "KHR" ? usd * nbcRate : usd);
      }, 0);
      alreadyPaid =
        paymentCurrencyUpper === "KHR"
          ? Math.round(alreadyPaid)
          : Number(alreadyPaid.toFixed(2));
      previousPaymentsCount = earlierPayments.length;
      const alreadyTolerance = currency === "KHR" ? 1 : 0.01;
      if (alreadyPaid + alreadyTolerance >= fullChargeAmount) {
        throw new AppError("You already have access to this course", 400);
      }

      const latest = await prisma.payment.findFirst({
        where: { userId, courseId: targetCourseId, status: "completed" },
        orderBy: { createdAt: "desc" },
        select: { metadata: true },
      });
      const latestMeta = (latest?.metadata as Record<string, unknown> | null) || {};
      previousTotalInstallments = Number(latestMeta.totalInstallments || 0);
    }

    // Check Part Payment / Installment Plan. For later payments, continue the
    // original schedule instead of charging the entire balance at once.
    let chargeAmount = fullChargeAmount;
    let totalInstallments = 1;
    let installmentIndex = 1;
    let remainingAmount = 0;
    let nextDueDate: string | null = null;

    if (alreadyPaid > 0) {
      totalInstallments = Math.max(2, previousTotalInstallments || Number(installments) || 2);
      installmentIndex = Math.min(previousPaymentsCount + 1, totalInstallments);
      const remainingBalance = fullChargeAmount - alreadyPaid;
      const partsLeft = Math.max(1, totalInstallments - previousPaymentsCount);
      chargeAmount =
        currency === "KHR"
          ? Math.round(remainingBalance / partsLeft)
          : Number((remainingBalance / partsLeft).toFixed(2));
      remainingAmount = Math.max(
        0,
        Number((remainingBalance - chargeAmount).toFixed(2))
      );
      if (remainingAmount > 0) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        nextDueDate = dueDate.toISOString();
      }
    } else if (paymentPlan === "installment" && fullChargeAmount > 0) {
      totalInstallments = Math.max(2, Math.min(Number(installments) || 2, 4));
      chargeAmount =
        currency === "KHR"
          ? Math.round(fullChargeAmount / totalInstallments)
          : Number((fullChargeAmount / totalInstallments).toFixed(2));
      remainingAmount = Number((fullChargeAmount - chargeAmount).toFixed(2));
      if (remainingAmount > 0) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        nextDueDate = dueDate.toISOString();
      }
    }

    // Check idempotency key if supplied
    const idempotencyKey = (req.headers["idempotency-key"] || req.headers["x-idempotency-key"]) as string | undefined;
    if (idempotencyKey) {
      const existingPayment = await prisma.payment.findFirst({
        where: {
          userId,
          courseId: targetCourseId,
          status: "pending",
          createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) }, // within last 15m
          metadata: {
            path: ["idempotencyKey"],
            equals: idempotencyKey,
          },
        } as any,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          course: { select: { id: true, title: true, price: true } },
        },
      });

      if (existingPayment) {
        const existingAmount = Number(existingPayment.amount);
        const existingMeta =
          (existingPayment.metadata as Record<string, unknown> | null) || {};
        const checkoutData: Record<string, unknown> = {
          paymentId: existingPayment.id,
          amount: existingAmount,
          fullPrice: finalAmount,
          currency: existingPayment.currency,
          amountKhr:
            existingPayment.currency === "KHR"
              ? existingAmount
              : Math.round(existingAmount * NBC_EXCHANGE_RATE),
          status: existingPayment.status,
          gateway: existingPayment.gateway,
          paymentPlan: existingMeta.paymentPlan ?? paymentPlan,
          totalInstallments: Number(existingMeta.totalInstallments ?? totalInstallments),
          installmentIndex: Number(existingMeta.installmentIndex ?? installmentIndex),
          remainingAmount: Number(existingMeta.remainingAmount ?? remainingAmount),
          nextDueDate: (existingMeta.nextDueDate as string | null) ?? nextDueDate,
        };

        const existingRef = existingPayment.gatewayRef || "REF";

        if (
          isPaywayConfigured() &&
          existingAmount > 0 &&
          existingPayment.course &&
          existingPayment.gateway !== "acleda"
        ) {
          checkoutData.payway = buildPaywayCheckout({
            paymentId: existingPayment.id,
            tranId: existingRef,
            amount: existingAmount,
            currency: existingPayment.currency,
            gateway: existingPayment.gateway,
            courseId: existingPayment.course.id,
            courseTitle: existingPayment.course.title,
            firstName: existingPayment.user.firstName,
            lastName: existingPayment.user.lastName,
            email: existingPayment.user.email,
          });
          checkoutData.sandbox = false;
          checkoutData.bankName = "ABA PayWay (KHQR / Card)";
          checkoutData.note = "Complete payment in the ABA PayWay window. Course access unlocks automatically once the full amount is confirmed.";
        } else {
          checkoutData.sandbox = true;
          const staticQr = getStaticPaymentQr(existingAmount, existingPayment.currency);
          if (
            (existingPayment.gateway === "khqr" || existingPayment.gateway === "aba_payway") &&
            existingAmount > 0
          ) {
            if (staticQr) {
              checkoutData.qrData = staticQr.payload;
              checkoutData.qrImage = staticQr.imageUrl;
              checkoutData.staticQr = true;
              checkoutData.bankName = "ACLEDA Bank KHQR";
              checkoutData.note =
                "Scan the QR with ACLEDA, Bakong, ABA, or any KHQR banking app. The exact amount is pre-filled — no typing needed.";
            } else {
              const abaLink = config.payments.abaPayLink;
              checkoutData.qrData = abaLink || `https://sandbox.khqr.gov.kh/pay/${existingRef}`;
              checkoutData.qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(String(checkoutData.qrData))}`;
              if (abaLink) {
                checkoutData.paymentUrl = abaLink;
                checkoutData.bankName = "ABA PayWay Payment Link";
                checkoutData.note =
                  "Scan the QR or tap the button to open the official ABA PayWay payment page, then complete the payment.";
              }
            }
          }
          if (existingPayment.gateway === "wing" && existingAmount > 0) {
            checkoutData.qrData = `https://sandbox.wingmoney.com/pay/${existingRef}`;
            checkoutData.qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(String(checkoutData.qrData))}`;
            checkoutData.paymentUrl = `https://sandbox.wingmoney.com/checkout/${existingRef}`;
          }
          if (existingPayment.gateway === "acleda" && existingAmount > 0) {
            checkoutData.bankName = "ACLEDA KHQR";
            if (staticQr) {
              checkoutData.qrData = staticQr.payload;
              checkoutData.qrImage = staticQr.imageUrl;
              checkoutData.staticQr = true;
              checkoutData.note =
                "Scan the QR with the ACLEDA mobile app or any KHQR banking app. The exact amount is pre-filled — no typing needed.";
            } else {
              const fallbackLink =
                config.payments.abaPayLink || `https://sandbox.khqr.gov.kh/pay/${existingRef}`;
              checkoutData.qrData = fallbackLink;
              checkoutData.qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                fallbackLink
              )}`;
              checkoutData.paymentUrl = config.payments.abaPayLink || undefined;
              checkoutData.note = config.payments.abaPayLink
                ? "This amount has no pre-set ACLEDA QR. Open the ABA payment link or scan the fallback QR and enter the exact amount shown."
                : "This amount has no pre-set ACLEDA QR. Scan the fallback QR and enter the exact amount shown.";
            }
          }
          if (existingPayment.gateway === "bakong" && existingAmount > 0) {
            checkoutData.deeplink = `bakong://payment?ref=${existingRef}`;
            checkoutData.qrData = `bakong://payment?ref=${existingRef}`;
            checkoutData.qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(String(checkoutData.qrData))}`;
          }
          if (existingPayment.gateway === "card" && existingAmount > 0) {
            checkoutData.paymentUrl = `https://sandbox.payway.com.kh/card-checkout/${existingRef}`;
          }
        }

        res.status(200).json({ success: true, data: { payment: existingPayment, checkout: checkoutData } });
        return;
      }
    }

    // For free courses, auto-complete
    const status = chargeAmount === 0 ? "completed" : "pending";
    const gatewayRef = chargeAmount > 0 ? generateGatewayRef(gateway) : null;

    const payment = await prisma.payment.create({
      data: {
        userId,
        courseId: targetCourseId,
        subscriptionId: subscriptionId || null,
        amount: chargeAmount,
        currency,
        status,
        gateway,
        gatewayRef,
        couponCode: couponCode || null,
        discountAmount: discountAmount > 0 ? discountAmount : null,
        metadata: {
          ...(idempotencyKey ? { idempotencyKey } : {}),
          paymentPlan: alreadyPaid > 0 ? "balance" : paymentPlan,
          totalInstallments,
          installmentIndex,
          fullCoursePrice: fullChargeAmount,
          chargeAmount,
          remainingAmount,
          nextDueDate,
        },
        paidAt: status === "completed" ? new Date() : null,
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true, price: true } },
      },
    });

    // Only consume coupon usage after a new payment has been created.
    if (appliedCouponId) {
      await prisma.coupon.update({
        where: { id: appliedCouponId },
        data: { usesCount: { increment: 1 } },
      });
    }

    // Auto-enroll for free courses
    if (status === "completed" && targetCourseId) {
      await prisma.enrollment.upsert({
        where: { userId_courseId: { userId, courseId: targetCourseId } },
        create: { userId, courseId: targetCourseId, status: "active", enrolledBy: userId },
        update: { status: "active" },
      });
    }

    await logAudit({
      userId,
      action: "CHECKOUT",
      entity: "Payment",
      entityId: payment.id,
      newValues: { courseId, subscriptionId, gateway, amount: chargeAmount, paymentPlan, status },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Build checkout payload
    const checkoutData: Record<string, unknown> = {
      paymentId: payment.id,
      amount: chargeAmount,
      fullPrice: finalAmount,
      currency,
      amountKhr:
        currency === "KHR" ? chargeAmount : Math.round(chargeAmount * NBC_EXCHANGE_RATE),
      paymentPlan: alreadyPaid > 0 ? "balance" : paymentPlan,
      totalInstallments,
      installmentIndex,
      remainingAmount,
      nextDueDate,
      status,
      gateway,
      expiresInSeconds: 300,
      pollIntervalSeconds: 3,
    };

    if (isPaywayConfigured() && chargeAmount > 0 && payment.course && gateway !== "acleda") {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { phone: true },
      });
      checkoutData.payway = buildPaywayCheckout({
        paymentId: payment.id,
        tranId: gatewayRef || payment.id,
        amount: chargeAmount,
        currency,
        gateway,
        courseId: payment.course.id,
        courseTitle: payment.course.title,
        firstName: payment.user.firstName,
        lastName: payment.user.lastName,
        email: payment.user.email,
        phone: profile?.phone,
      });
      checkoutData.sandbox = false;
      checkoutData.bankName = gateway === "card" ? "Card Payment (ABA PayWay)" : "Bakong KHQR (via ABA PayWay)";
      checkoutData.note =
        gateway === "card"
          ? "Complete the card payment in the ABA PayWay window. Access unlocks automatically after confirmation."
          : "Scan with ABA Mobile or any KHQR banking app (Wing, ACLEDA, Canadia, Sathapana...). The exact amount is pre-filled — no typing needed.";
    } else {
      checkoutData.sandbox = true;
      const staticQr = getStaticPaymentQr(chargeAmount, currency);
      if (
        (gateway === "khqr" || gateway === "aba_payway") &&
        chargeAmount > 0
      ) {
        if (staticQr) {
          checkoutData.qrData = staticQr.payload;
          checkoutData.qrImage = staticQr.imageUrl;
          checkoutData.staticQr = true;
          checkoutData.bankName = "ACLEDA Bank KHQR";
          checkoutData.note =
            "Scan the QR with ACLEDA, Bakong, ABA, or any KHQR banking app. The exact amount is pre-filled — no typing needed.";
        } else {
          const abaLink = config.payments.abaPayLink;
          checkoutData.qrData = abaLink || `https://sandbox.khqr.gov.kh/pay/${gatewayRef}`;
          checkoutData.qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(String(checkoutData.qrData))}`;
          if (abaLink) {
            checkoutData.paymentUrl = abaLink;
            checkoutData.bankName = "ABA PayWay Payment Link";
            checkoutData.note =
              "Scan the QR or tap the button to open the official ABA PayWay payment page, then complete the payment.";
          } else {
            checkoutData.bankName = "Bakong KHQR (All Cambodian Banks)";
            checkoutData.note = "Scan with Bakong, ABA, ACLEDA, Wing, Sathapana, or Canadia bank apps.";
          }
        }
      }
      if (gateway === "wing" && chargeAmount > 0) {
        checkoutData.qrData = `https://sandbox.wingmoney.com/pay/${gatewayRef}`;
        checkoutData.qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(String(checkoutData.qrData))}`;
        checkoutData.paymentUrl = `https://sandbox.wingmoney.com/checkout/${gatewayRef}`;
        checkoutData.bankName = "Wing Bank & WingPay";
        checkoutData.note = "Scan with Wing Bank App or pay via WingPay.";
      }
      if (gateway === "acleda" && chargeAmount > 0) {
        checkoutData.bankName = "ACLEDA KHQR";
        if (staticQr) {
          checkoutData.qrData = staticQr.payload;
          checkoutData.qrImage = staticQr.imageUrl;
          checkoutData.staticQr = true;
          checkoutData.note =
            "Scan the QR with the ACLEDA mobile app or any KHQR banking app. The exact amount is pre-filled — no typing needed.";
        } else {
          const fallbackLink =
            config.payments.abaPayLink || `https://sandbox.khqr.gov.kh/pay/${gatewayRef}`;
          checkoutData.qrData = fallbackLink;
          checkoutData.qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
            fallbackLink
          )}`;
          checkoutData.paymentUrl = config.payments.abaPayLink || undefined;
          checkoutData.note = config.payments.abaPayLink
            ? "This amount has no pre-set ACLEDA QR. Open the ABA payment link or scan the fallback QR and enter the exact amount shown."
            : "This amount has no pre-set ACLEDA QR. Scan the fallback QR and enter the exact amount shown.";
        }
      }
      if (gateway === "bakong" && chargeAmount > 0) {
        checkoutData.deeplink = `bakong://payment?ref=${gatewayRef}`;
        checkoutData.qrData = `bakong://payment?ref=${gatewayRef}`;
        checkoutData.qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(String(checkoutData.qrData))}`;
        checkoutData.bankName = "Bakong Wallet Deeplink";
        checkoutData.note = "Scan with Bakong wallet or tap to switch to the Bakong app.";
      }
      if (gateway === "card" && chargeAmount > 0) {
        checkoutData.paymentUrl = `https://sandbox.payway.com.kh/card-checkout/${gatewayRef}`;
        checkoutData.bankName = "Credit / Debit Card (Visa, Mastercard, UnionPay)";
        checkoutData.note = "Processed securely via ABA PayWay PCI-DSS gateway.";
      }
    }

    res.status(201).json({ success: true, data: { payment, checkout: checkoutData } });
  } catch (error) {
    next(error);
  }
};

export const confirmPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { gatewayRef, status } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!payment) throw new AppError("Payment not found", 404);
    if (payment.status !== "pending") {
      throw new AppError("Payment is not in pending status", 400);
    }

    const isAdmin = req.user?.role === "ADMIN";
    const isOwner = payment.userId === req.user?.id;
    const sandboxConfirmAllowed =
      config.payments.allowSandboxConfirm && !config.isProduction;
    if (!isAdmin && !(sandboxConfirmAllowed && isOwner)) {
      throw new AppError("Only an administrator can confirm this payment", 403);
    }

    if (gatewayRef) {
      await prisma.payment.update({
        where: { id },
        data: { gatewayRef },
      });
    }

    if (status === "completed") {
      await finalizePaymentCompleted(id);
    } else {
      await markPaymentStatus(id, status);
    }

    const updated = await prisma.payment.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: "CONFIRM_PAYMENT",
      entity: "Payment",
      entityId: id,
      newValues: { status, gatewayRef },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const handleWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { gateway } = req.params;
    const payload = req.body;

    // Legacy gateway webhooks must be authenticated with a shared secret.
    // Development/sandbox can leave it unset, production may not.
    if (config.isProduction && !config.payments.webhookSecret) {
      throw new AppError("Payment webhook secret is not configured", 503);
    }
    if (config.payments.webhookSecret) {
      const providedSecret = String(req.headers["x-webhook-secret"] || "");
      if (providedSecret !== config.payments.webhookSecret) {
        throw new AppError("Invalid webhook signature", 401);
      }
    }

    const gatewayRef = payload.gatewayRef || payload.transactionId || payload.ref;
    const status = payload.status || payload.result;

    if (!gatewayRef) {
      throw new AppError("Missing gateway reference in webhook", 400);
    }

    const payment = await prisma.payment.findFirst({
      where: { gatewayRef, gateway },
      include: { course: true },
    });

    if (!payment) {
      // Return 200 to prevent retries for unknown refs in sandbox
      return res.json({ success: true, message: "Payment not found, webhook acknowledged" });
    }

    if (payment.status === "completed" || payment.status === "refunded") {
      return res.json({ success: true, message: "Payment already finalized" });
    }

    const webhookAmount = payload.amount ?? payload.total_amount ?? payload.payment_amount;
    if (webhookAmount !== undefined && webhookAmount !== null) {
      const expected = Number(payment.amount);
      const received = Number(webhookAmount);
      const tolerance = payment.currency === "KHR" ? 1 : 0.01;
      if (!Number.isFinite(received) || received + tolerance < expected) {
        throw new AppError("Webhook amount does not match the payment", 400);
      }
    }

    const normalizedStatus = status === "success" || status === "completed" ? "completed" : "failed";

    if (normalizedStatus === "completed") {
      await finalizePaymentCompleted(payment.id);
    } else {
      await markPaymentStatus(payment.id, "failed");
    }

    await logAudit({
      action: "WEBHOOK_PAYMENT",
      entity: "Payment",
      entityId: payment.id,
      newValues: { gateway, status: normalizedStatus, gatewayRef },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Webhook processed" });
  } catch (error) {
    return next(error);
  }
};

/**
 * ABA PayWay return/callback endpoint. PayWay POSTs the transaction result here
 * after the customer pays. The request is authenticated with the
 * X-PayWay-Hmac-Sha512 header, then the payment is marked completed and the
 * student is enrolled only when the full course amount has been received.
 */
export const handlePaywayCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const payload = (req.body || {}) as Record<string, unknown>;
    const signature = String(req.headers["x-payway-hmac-sha512"] || "");

    if (!verifyPaywaySignature(payload, signature)) {
      throw new AppError("Invalid PayWay signature", 401);
    }

    const tranId = String(payload.tran_id || "");
    if (!tranId) throw new AppError("Missing transaction id", 400);

    const payment = await prisma.payment.findFirst({
      where: { gatewayRef: tranId },
      include: { course: true },
    });

    if (!payment) {
      return res.json({ success: true, message: "Unknown transaction acknowledged" });
    }
    if (payment.status === "completed" || payment.status === "refunded") {
      return res.json({ success: true, message: "Payment already finalized" });
    }

    const approved = String(payload.status) === "0";
    if (!approved) {
      await markPaymentStatus(payment.id, "failed");
      await logAudit({
        action: "PAYWAY_PAYMENT_FAILED",
        entity: "Payment",
        entityId: payment.id,
        newValues: { status: payload.status, tran_id: tranId },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      return res.json({ success: true, message: "Payment not approved" });
    }

    const expectedAmount = Number(payment.amount);
    const paidAmount = Number(
      payload.original_amount ?? payload.total_amount ?? payload.payment_amount ?? 0
    );
    const tolerance = payment.currency === "KHR" ? 1 : 0.01;

    if (!paidAmount || paidAmount + tolerance < expectedAmount) {
      await markPaymentStatus(payment.id, "failed");
      await logAudit({
        action: "PAYWAY_AMOUNT_MISMATCH",
        entity: "Payment",
        entityId: payment.id,
        newValues: { expectedAmount, paidAmount, currency: payment.currency, tran_id: tranId },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      return res.json({ success: true, message: "Amount mismatch" });
    }

    const finalized = await finalizePaymentCompleted(payment.id);

    await logAudit({
      action: "PAYWAY_PAYMENT_COMPLETED",
      entity: "Payment",
      entityId: payment.id,
      newValues: {
        tran_id: tranId,
        paidAmount,
        currency: payment.currency,
        enrolled: finalized.enrolled,
        apv: payload.apv,
        payment_type: payload.payment_type,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({
      success: true,
      message: "Payment confirmed",
      enrolled: finalized.enrolled,
    });
  } catch (error) {
    return next(error);
  }
};

export const getPaymentHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = "1", limit = "20", status, gateway } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (gateway) where.gateway = gateway;

    // Students see only their own payments; instructors only payments for
    // their own courses; admins see everything.
    if (req.user?.role === "STUDENT") {
      where.userId = req.user.id;
    } else if (req.user?.role === "INSTRUCTOR") {
      where.course = { instructorId: req.user.id };
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          course: { select: { id: true, title: true, thumbnailUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      success: true,
      data: payments,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true, price: true, instructorId: true } },
      },
    });

    if (!payment) throw new AppError("Payment not found", 404);
    if (req.user?.role === "STUDENT" && payment.userId !== req.user.id) {
      throw new AppError("Not authorized to view this payment", 403);
    }
    if (
      req.user?.role === "INSTRUCTOR" &&
      payment.course?.instructorId !== req.user.id
    ) {
      throw new AppError("Not authorized to view this payment", 403);
    }

    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

export const getPaymentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    let payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true, instructorId: true } },
      },
    });

    if (!payment) throw new AppError("Payment not found", 404);
    if (req.user?.role === "STUDENT" && payment.userId !== req.user.id) {
      throw new AppError("Not authorized to view this payment", 403);
    }
    if (
      req.user?.role === "INSTRUCTOR" &&
      payment.course?.instructorId !== req.user.id
    ) {
      throw new AppError("Not authorized to view this payment", 403);
    }

    const providerCheck = await checkProviderPaymentStatus(payment);

    payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true, instructorId: true } },
      },
    });
    if (!payment) throw new AppError("Payment not found", 404);

    const expiresAt = paymentExpiresAt(payment);
    if (payment.status === "pending" && Date.now() > expiresAt.getTime()) {
      const expired = await prisma.payment.updateMany({
        where: { id, status: "pending" },
        data: { status: "expired" },
      });
      if (expired.count > 0) {
        payment = await prisma.payment.findUnique({
          where: { id },
          include: {
            course: { select: { id: true, title: true, instructorId: true } },
          },
        });
      }
    }
    if (!payment) throw new AppError("Payment not found", 404);

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        status: payment.status,
        amount: Number(payment.amount),
        currency: payment.currency,
        gateway: payment.gateway,
        gatewayRef: payment.gatewayRef,
        course: payment.course,
        createdAt: payment.createdAt,
        expiresAt,
        providerChecked: providerCheck.checked,
        providerStatus: providerCheck.providerStatus,
        pollIntervalSeconds: 3,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentQr = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { course: { select: { id: true, title: true, instructorId: true } } },
    });

    if (!payment) throw new AppError("Payment not found", 404);
    if (req.user?.role === "STUDENT" && payment.userId !== req.user.id) {
      throw new AppError("Not authorized to view this payment", 403);
    }
    if (
      req.user?.role === "INSTRUCTOR" &&
      payment.course?.instructorId !== req.user.id
    ) {
      throw new AppError("Not authorized to view this payment", 403);
    }

    const staticQr = getStaticPaymentQr(Number(payment.amount), payment.currency);
    const fallbackPayload =
      config.payments.abaPayLink ||
      `https://sandbox.khqr.gov.kh/pay/${payment.gatewayRef || payment.id}`;

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        gatewayRef: payment.gatewayRef,
        course: payment.course,
        imageUrl: staticQr
          ? staticQr.imageUrl
          : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
              fallbackPayload
            )}`,
        payload: staticQr ? staticQr.payload : fallbackPayload,
        staticQr: Boolean(staticQr),
        bankName: staticQr ? "ACLEDA KHQR" : "KHQR / ABA Payment",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refundPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!payment) throw new AppError("Payment not found", 404);
    if (payment.status !== "completed") {
      throw new AppError("Only completed payments can be refunded", 400);
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status: "refunded",
        refundedAt: new Date(),
        refundReason: reason,
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });

    // Recompute the remaining balance so refunding one installment does not
    // revoke access when the student still has other completed payments.
    if (payment.courseId) {
      const meta = (payment.metadata as Record<string, unknown> | null) || {};
      let requiredAmount = Number(meta.fullCoursePrice ?? 0);
      let requiredCurrency = payment.currency;
      if (!requiredAmount) {
        requiredAmount = payment.course?.price
          ? Number(payment.course.price)
          : Number(payment.amount);
        requiredCurrency = payment.course?.currency || payment.currency;
      }

      const completed = await prisma.payment.findMany({
        where: {
          userId: payment.userId,
          courseId: payment.courseId,
          status: "completed",
        },
        select: { amount: true, currency: true },
      });
      const remainingPaidUsd = completed.reduce(
        (sum, item) => sum + toUsd(Number(item.amount), item.currency),
        0
      );
      const requiredUsd = toUsd(requiredAmount, requiredCurrency);

      if (remainingPaidUsd + 0.01 < requiredUsd) {
        await prisma.enrollment.updateMany({
          where: { userId: payment.userId, courseId: payment.courseId, status: "active" },
          data: { status: "dropped" },
        });
      }
    }

    await logAudit({
      userId: req.user?.id,
      action: "REFUND_PAYMENT",
      entity: "Payment",
      entityId: id,
      newValues: { status: "refunded", reason },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const generateInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true, instructorId: true } },
      },
    });

    if (!payment) throw new AppError("Payment not found", 404);
    if (req.user?.role === "STUDENT" && payment.userId !== req.user.id) {
      throw new AppError("Not authorized to view this invoice", 403);
    }
    if (
      req.user?.role === "INSTRUCTOR" &&
      payment.course?.instructorId !== req.user.id
    ) {
      throw new AppError("Not authorized to view this invoice", 403);
    }

    const meta = (payment.metadata || {}) as Record<string, any>;
    const isInstallment = meta.paymentPlan === "installment";

    const invoice = {
      invoiceNumber: generateInvoiceNumber(),
      issuedAt: new Date().toISOString(),
      billedTo: {
        name: `${payment.user?.firstName || ""} ${payment.user?.lastName || ""}`.trim() || "Student",
        email: payment.user?.email,
      },
      items: [
        {
          description: payment.course
            ? isInstallment
              ? `Course: ${payment.course.title} (Part Payment — Installment ${meta.installmentIndex || 1} of ${meta.totalInstallments || 2})`
              : `Course: ${payment.course.title}`
            : "Subscription",
          amount: payment.amount,
          currency: payment.currency,
        },
      ],
      subtotal: payment.amount,
      discount: payment.discountAmount || 0,
      total: payment.amount,
      currency: payment.currency,
      paymentPlan: isInstallment ? "installment" : "full",
      installmentSchedule: isInstallment
        ? {
            installmentIndex: meta.installmentIndex || 1,
            totalInstallments: meta.totalInstallments || 2,
            fullCoursePrice: meta.fullCoursePrice || payment.amount,
            amountPaid: payment.amount,
            remainingAmount: meta.remainingAmount || 0,
            nextDueDate: meta.nextDueDate || null,
          }
        : null,
      payment: {
        method: payment.gateway,
        reference: payment.gatewayRef,
        paidAt: payment.paidAt,
      },
      status: payment.status,
    };

    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

export const getRevenueReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId, startDate, endDate } = req.query as Record<string, string>;

    const where: Record<string, unknown> = { status: "completed" };
    if (courseId) where.courseId = courseId;
    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) (where.paidAt as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.paidAt as Record<string, unknown>).lte = new Date(endDate);
    }

    // Instructors see revenue only for their own courses
    if (req.user?.role === "INSTRUCTOR") {
      const instructorCourses = await prisma.course.findMany({
        where: { instructorId: req.user.id },
        select: { id: true },
      });
      const courseIds = instructorCourses.map((c) => c.id);
      if (courseId && !courseIds.includes(courseId)) {
        throw new AppError("Not authorized", 403);
      }
      where.courseId = courseId ? courseId : { in: courseIds };
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        course: { select: { id: true, title: true, instructorId: true } },
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { paidAt: "desc" },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalRefunded = await prisma.payment.aggregate({
      where: { ...where, status: "refunded" },
      _sum: { amount: true },
    });

    // Group by course
    const courseRevenue = new Map<string, { courseTitle: string; revenue: number; count: number }>();
    for (const p of payments) {
      const key = p.courseId || "subscription";
      if (!courseRevenue.has(key)) {
        courseRevenue.set(key, { courseTitle: p.course?.title || "Subscription", revenue: 0, count: 0 });
      }
      const entry = courseRevenue.get(key)!;
      entry.revenue += Number(p.amount);
      entry.count += 1;
    }

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalRefunded: Number(totalRefunded._sum.amount || 0),
        transactionCount: payments.length,
        courseBreakdown: Array.from(courseRevenue.entries()).map(([id, data]) => ({ courseId: id, ...data })),
        payments,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getInstructorPayouts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = "1", limit = "20", status } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    if (req.user?.role === "INSTRUCTOR") {
      where.instructorId = req.user.id;
    }

    const [payouts, total] = await Promise.all([
      prisma.instructorPayout.findMany({
        where,
        include: {
          instructor: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.instructorPayout.count({ where }),
    ]);

    const totalPending = await prisma.instructorPayout.aggregate({
      where: { ...where, status: "pending" },
      _sum: { amount: true },
    });

    res.json({
      success: true,
      data: payouts,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      summary: { totalPending: Number(totalPending._sum.amount || 0) },
    });
  } catch (error) {
    next(error);
  }
};

export const processPayout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const payout = await prisma.instructorPayout.findUnique({ where: { id } });
    if (!payout) throw new AppError("Payout not found", 404);
    if (payout.status !== "pending") {
      throw new AppError("Only pending payouts can be processed", 400);
    }

    const updated = await prisma.instructorPayout.update({
      where: { id },
      data: {
        status: "processed",
        processedAt: new Date(),
        transactionRef: `POUT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: "PROCESS_PAYOUT",
      entity: "InstructorPayout",
      entityId: id,
      newValues: { status: "processed", transactionRef: updated.transactionRef },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// ─── Coupons ───

export const createCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { code, description, discountType, discountValue, maxUses, validFrom, validUntil, courseId } = req.body;

    const coupon = await prisma.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        description,
        discountType,
        discountValue,
        maxUses,
        validFrom: new Date(validFrom),
        validUntil: validUntil ? new Date(validUntil) : null,
        courseId: courseId || null,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: "CREATE_COUPON",
      entity: "Coupon",
      entityId: coupon.id,
      newValues: { code, discountType, discountValue },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    next(error);
  }
};

export const getCoupons = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = "1", limit = "20", isActive } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (isActive !== undefined) where.isActive = isActive === "true";

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.coupon.count({ where }),
    ]);

    res.json({
      success: true,
      data: coupons,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

export const validateCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { code, courseId } = req.body;

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!coupon) throw new AppError("Invalid coupon code", 400);
    if (!coupon.isActive) throw new AppError("Coupon is inactive", 400);
    if (coupon.validUntil && new Date() > coupon.validUntil) throw new AppError("Coupon has expired", 400);
    if (coupon.maxUses && coupon.usesCount >= coupon.maxUses) throw new AppError("Coupon usage limit reached", 400);
    if (coupon.courseId && coupon.courseId !== courseId) {
      throw new AppError("Coupon is not valid for this course", 400);
    }

    res.json({
      success: true,
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        valid: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Subscription Plans ───

export const createSubscriptionPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, description, price, currency, durationMonths, features } = req.body;

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        description,
        price,
        currency: currency || "USD",
        durationMonths,
        features: features || [],
      },
    });

    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

export const getSubscriptionPlans = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });
    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
};

export const updateSubscriptionPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, description, price, currency, durationMonths, features, isActive } = req.body;

    const plan = await prisma.subscriptionPlan.update({
      where: { id },
      data: { name, description, price, currency, durationMonths, features, isActive },
    });

    res.json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

export const deleteSubscriptionPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    await prisma.subscriptionPlan.delete({ where: { id } });
    res.json({ success: true, message: "Subscription plan deleted" });
  } catch (error) {
    next(error);
  }
};
