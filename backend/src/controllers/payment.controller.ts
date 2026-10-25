import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "../utils/audit";
import { config } from "../config";

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

async function calculateRevenueShare(_courseId: string, amount: number): Promise<number> {
  // Default: instructor gets 70%
  const settings = await prisma.setting.findUnique({ where: { key: "instructor_revenue_share" } });
  const sharePercent = settings ? parseFloat(settings.value) : 70;
  return Number(((amount * sharePercent) / 100).toFixed(2));
}

async function createInstructorPayout(courseId: string, paymentId: string, amount: number) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });
  if (!course) return;

  const revenue = await calculateRevenueShare(courseId, amount);
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

async function applyCoupon(couponCode: string, amount: number, courseId?: string): Promise<{ discountAmount: number; finalAmount: number }> {
  const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
  if (!coupon || !coupon.isActive) return { discountAmount: 0, finalAmount: amount };

  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) return { discountAmount: 0, finalAmount: amount };
  if (coupon.validUntil && now > coupon.validUntil) return { discountAmount: 0, finalAmount: amount };
  if (coupon.maxUses && coupon.usesCount >= coupon.maxUses) return { discountAmount: 0, finalAmount: amount };
  if (coupon.courseId && coupon.courseId !== courseId) return { discountAmount: 0, finalAmount: amount };

  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    discountAmount = Number(((amount * Number(coupon.discountValue)) / 100).toFixed(2));
  } else {
    discountAmount = Number(coupon.discountValue);
  }
  discountAmount = Math.min(discountAmount, amount);
  const finalAmount = Number((amount - discountAmount).toFixed(2));

  await prisma.coupon.update({
    where: { id: coupon.id },
    data: { usesCount: { increment: 1 } },
  });

  return { discountAmount, finalAmount };
}

// ─── Controllers ───

export const checkout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId, subscriptionId, gateway, couponCode } = req.body;
    const userId = req.user!.id;

    if (!courseId && !subscriptionId) {
      throw new AppError("Either courseId or subscriptionId is required", 400);
    }

    let amount = 0;
    let currency = "USD";
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
      currency = course.currency || "USD";
      if (course.isFree) amount = 0;
    }

    if (subscriptionId) {
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: subscriptionId } });
      if (!plan) throw new AppError("Subscription plan not found", 404);
      if (!plan.isActive) throw new AppError("Subscription plan is not active", 400);
      amount = Number(plan.price);
      currency = plan.currency;
    }

    // Apply coupon if provided
    let discountAmount = 0;
    let finalAmount = amount;
    if (couponCode && amount > 0) {
      const couponResult = await applyCoupon(couponCode, amount, targetCourseId || undefined);
      discountAmount = couponResult.discountAmount;
      finalAmount = couponResult.finalAmount;
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
        },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          course: { select: { id: true, title: true, price: true } },
        },
      });

      if (existingPayment) {
        const checkoutData: Record<string, unknown> = {
          paymentId: existingPayment.id,
          amount: Number(existingPayment.amount),
          currency: existingPayment.currency,
          status: existingPayment.status,
          gateway: existingPayment.gateway,
        };

        if (existingPayment.gateway === "khqr" && Number(existingPayment.amount) > 0) {
          checkoutData.qrData = `https://sandbox.khqr.gov.kh/pay/${existingPayment.gatewayRef}`;
          checkoutData.qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(String(checkoutData.qrData))}`;
        }
        if (existingPayment.gateway === "aba_payway" && Number(existingPayment.amount) > 0) {
          checkoutData.paymentUrl = config.payments.abaPayLink || `https://sandbox.payway.com.kh/payment/${existingPayment.gatewayRef}`;
        }
        if (existingPayment.gateway === "bakong" && Number(existingPayment.amount) > 0) {
          checkoutData.deeplink = `bakong://payment?ref=${existingPayment.gatewayRef}`;
          checkoutData.qrData = `bakong://payment?ref=${existingPayment.gatewayRef}`;
          checkoutData.qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(String(checkoutData.qrData))}`;
        }

        res.status(200).json({ success: true, data: { payment: existingPayment, checkout: checkoutData } });
        return;
      }
    }

    // For free courses, auto-complete
    const status = finalAmount === 0 ? "completed" : "pending";
    const gatewayRef = finalAmount > 0 ? generateGatewayRef(gateway) : null;

    const payment = await prisma.payment.create({
      data: {
        userId,
        courseId: targetCourseId,
        subscriptionId: subscriptionId || null,
        amount: finalAmount,
        currency,
        status,
        gateway,
        gatewayRef,
        couponCode: couponCode || null,
        discountAmount: discountAmount > 0 ? discountAmount : null,
        metadata: idempotencyKey ? { idempotencyKey } : undefined,
        paidAt: status === "completed" ? new Date() : null,
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true, price: true } },
      },
    });

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
      newValues: { courseId, subscriptionId, gateway, amount: finalAmount, status },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Build checkout payload (in sandbox, return a mock QR / deeplink)
    const checkoutData: Record<string, unknown> = {
      paymentId: payment.id,
      amount: finalAmount,
      currency,
      status,
      gateway,
    };

    if (gateway === "khqr" && finalAmount > 0) {
      checkoutData.qrData = `https://sandbox.khqr.gov.kh/pay/${gatewayRef}`;
      checkoutData.qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(String(checkoutData.qrData))}`;
    }
    if (gateway === "aba_payway" && finalAmount > 0) {
      checkoutData.paymentUrl = config.payments.abaPayLink || `https://sandbox.payway.com.kh/payment/${gatewayRef}`;
      checkoutData.note = "Please pay the exact amount shown on ABA Pay. After payment, your enrollment will be confirmed by the admin within 24 hours.";
    }
    if (gateway === "bakong" && finalAmount > 0) {
      checkoutData.deeplink = `bakong://payment?ref=${gatewayRef}`;
      checkoutData.qrData = `bakong://payment?ref=${gatewayRef}`;
      checkoutData.qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(String(checkoutData.qrData))}`;
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

    const updateData: Record<string, unknown> = { status };
    if (status === "completed") {
      updateData.paidAt = new Date();
      if (gatewayRef) {
        updateData.gatewayRef = gatewayRef;
      }
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });

    if (status === "completed" && payment.courseId) {
      // Auto-enroll
      await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: payment.userId, courseId: payment.courseId } },
        create: { userId: payment.userId, courseId: payment.courseId, status: "active", enrolledBy: payment.userId },
        update: { status: "active" },
      });

      // Record instructor revenue
      await createInstructorPayout(payment.courseId, payment.id, Number(payment.amount));
    }

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

    // In production, verify webhook signatures here
    // For sandbox, accept any payload shape that includes gatewayRef and status
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

    const normalizedStatus = status === "success" || status === "completed" ? "completed" : "failed";
    const updateData: Record<string, unknown> = { status: normalizedStatus };
    if (normalizedStatus === "completed") {
      updateData.paidAt = new Date();
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: updateData,
    });

    if (normalizedStatus === "completed" && payment.courseId) {
      await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: payment.userId, courseId: payment.courseId } },
        create: { userId: payment.userId, courseId: payment.courseId, status: "active", enrolledBy: payment.userId },
        update: { status: "active" },
      });
      await createInstructorPayout(payment.courseId, payment.id, Number(payment.amount));
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

    // Students see only their own payments
    if (req.user?.role === "STUDENT") {
      where.userId = req.user.id;
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
        course: { select: { id: true, title: true, price: true } },
      },
    });

    if (!payment) throw new AppError("Payment not found", 404);
    if (req.user?.role === "STUDENT" && payment.userId !== req.user.id) {
      throw new AppError("Not authorized to view this payment", 403);
    }

    res.json({ success: true, data: payment });
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

    // Unenroll student if course payment
    if (payment.courseId) {
      await prisma.enrollment.updateMany({
        where: { userId: payment.userId, courseId: payment.courseId, status: "active" },
        data: { status: "dropped" },
      });
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
        course: { select: { id: true, title: true } },
      },
    });

    if (!payment) throw new AppError("Payment not found", 404);
    if (req.user?.role === "STUDENT" && payment.userId !== req.user.id) {
      throw new AppError("Not authorized to view this invoice", 403);
    }

    const invoice = {
      invoiceNumber: generateInvoiceNumber(),
      issuedAt: new Date().toISOString(),
      billedTo: {
        name: `${payment.user?.firstName || ""} ${payment.user?.lastName || ""}`.trim(),
        email: payment.user?.email,
      },
      items: [
        {
          description: payment.course ? `Course: ${payment.course.title}` : "Subscription",
          amount: payment.amount,
          currency: payment.currency,
        },
      ],
      subtotal: payment.amount,
      discount: payment.discountAmount || 0,
      total: payment.amount,
      currency: payment.currency,
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
        code: code.toUpperCase(),
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

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
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
