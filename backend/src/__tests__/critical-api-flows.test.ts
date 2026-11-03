import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => {
  const model = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
  });
  return {
    prismaMock: {
      course: model(),
      enrollment: model(),
      lesson: model(),
      lessonCompletion: model(),
      notification: model(),
      user: model(),
      refreshToken: model(),
      payment: model(),
      profile: model(),
      auditLog: model(),
      setting: model(),
      coupon: model(),
      subscriptionPlan: model(),
      instructorPayout: model(),
    },
  };
});

vi.mock("../lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("../utils/audit", () => ({ logAudit: vi.fn() }));
vi.mock("../utils/password", () => ({
  comparePassword: vi.fn(),
  hashPassword: vi.fn(),
}));
vi.mock("../lib/payway", () => ({
  isPaywayConfigured: vi.fn(() => false),
  checkPaywayTransaction: vi.fn(),
  verifyPaywaySignature: vi.fn(() => true),
  buildPaywayCheckout: vi.fn(),
}));

import {
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from "../controllers/notification.controller";
import { completeLesson } from "../controllers/lesson.controller";
import { selfEnroll } from "../controllers/enrollment.controller";
import {
  changePassword,
  updateProfile,
} from "../controllers/auth.controller";
import {
  getPaymentStatus,
  handleWebhook,
} from "../controllers/payment.controller";
import { comparePassword, hashPassword } from "../utils/password";

const student = { id: "student-1", role: "STUDENT" };

function mockResponse() {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

function mockRequest(overrides: Record<string, unknown> = {}) {
  return {
    params: {},
    body: {},
    query: {},
    headers: {},
    user: student,
    ip: "127.0.0.1",
    get: vi.fn(() => "vitest"),
    ...overrides,
  } as any;
}

describe("critical API flows (mocked Prisma)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(comparePassword).mockResolvedValue(true);
    vi.mocked(hashPassword).mockResolvedValue("new-hash");
  });

  it("self-enrolls a student in a free published course", async () => {
    prismaMock.course.findFirst.mockResolvedValue({
      id: "course-1",
      status: "PUBLISHED",
      isFree: true,
      price: 0,
      prerequisites: [],
    });
    prismaMock.enrollment.findUnique.mockResolvedValue(null);
    prismaMock.enrollment.create.mockResolvedValue({
      id: "enrollment-1",
      userId: student.id,
      courseId: "course-1",
      status: "active",
    });
    const res = mockResponse();
    const next = vi.fn();

    await selfEnroll(
      mockRequest({ body: { courseId: "course-1" } }),
      res,
      next
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(prismaMock.enrollment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: student.id,
          courseId: "course-1",
          status: "active",
        }),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it("marks a lesson complete and recalculates course progress", async () => {
    prismaMock.lesson.findUnique.mockResolvedValue({
      id: "lesson-1",
      isPublished: true,
      dripDays: null,
      module: { course: { id: "course-1", status: "PUBLISHED" } },
    });
    prismaMock.enrollment.findUnique.mockResolvedValue({
      id: "enrollment-1",
      status: "active",
      enrolledAt: new Date(),
    });
    prismaMock.lessonCompletion.upsert.mockResolvedValue({});
    prismaMock.lesson.count.mockResolvedValue(4);
    prismaMock.lessonCompletion.findMany.mockResolvedValue([
      { lessonId: "lesson-1" },
    ]);
    prismaMock.enrollment.update.mockResolvedValue({
      id: "enrollment-1",
      progressPercent: 25,
    });
    const res = mockResponse();
    const next = vi.fn();

    await completeLesson(
      mockRequest({ params: { id: "lesson-1" } }),
      res,
      next
    );

    expect(next).not.toHaveBeenCalled();
    expect(prismaMock.lessonCompletion.upsert).toHaveBeenCalled();
    expect(prismaMock.enrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "enrollment-1" },
        data: expect.objectContaining({ progressPercent: 25 }),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          lessonId: "lesson-1",
          progressPercent: 25,
          completedLessons: 1,
          totalLessons: 4,
        }),
      })
    );
  });

  it("returns the unread count and marks notifications read", async () => {
    prismaMock.notification.count.mockResolvedValue(3);
    const countRes = mockResponse();
    await getUnreadCount(mockRequest(), countRes, vi.fn());
    expect(countRes.json).toHaveBeenCalledWith({
      success: true,
      data: { unreadCount: 3 },
    });

    prismaMock.notification.findUnique.mockResolvedValue({
      id: "notification-1",
      userId: student.id,
    });
    prismaMock.notification.update.mockResolvedValue({
      id: "notification-1",
      isRead: true,
    });
    const readRes = mockResponse();
    await markAsRead(
      mockRequest({ params: { id: "notification-1" } }),
      readRes,
      vi.fn()
    );
    expect(readRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );

    prismaMock.notification.updateMany.mockResolvedValue({ count: 3 });
    const allRes = mockResponse();
    await markAllAsRead(mockRequest(), allRes, vi.fn());
    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: student.id, isRead: false },
      data: expect.objectContaining({ isRead: true }),
    });
  });

  it("updates the student profile and changes the password", async () => {
    const updated = {
      id: student.id,
      email: "student@elms.edu",
      firstName: "Dara",
      lastName: "Sok",
      role: "STUDENT",
      status: "ACTIVE",
      profile: { phone: "+855 12 345 678" },
    };
    prismaMock.user.update.mockResolvedValue(updated);
    const profileRes = mockResponse();
    await updateProfile(
      mockRequest({
        body: {
          firstName: "Dara",
          lastName: "Sok",
          phone: "+855 12 345 678",
        },
      }),
      profileRes,
      vi.fn()
    );
    expect(profileRes.json).toHaveBeenCalledWith({ success: true, data: updated });

    prismaMock.user.findUnique.mockResolvedValue({
      id: student.id,
      passwordHash: "old-hash",
    });
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 2 });
    const passwordRes = mockResponse();
    await changePassword(
      mockRequest({
        body: {
          currentPassword: "Student123!",
          newPassword: "NewPass123!",
        },
      }),
      passwordRes,
      vi.fn()
    );

    expect(comparePassword).toHaveBeenCalledWith("Student123!", "old-hash");
    expect(hashPassword).toHaveBeenCalledWith("NewPass123!");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: student.id },
      data: { passwordHash: "new-hash" },
    });
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalled();
    expect(passwordRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it("expires a pending payment after five minutes", async () => {
    const oldPayment = {
      id: "payment-1",
      userId: student.id,
      status: "pending",
      amount: 39.99,
      currency: "USD",
      gateway: "khqr",
      gatewayRef: "KHQR-1",
      course: { id: "course-1", title: "Crypto Trading", instructorId: "i-1" },
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
    };
    prismaMock.payment.findUnique
      .mockResolvedValueOnce(oldPayment)
      .mockResolvedValueOnce(oldPayment)
      .mockResolvedValueOnce({ ...oldPayment, status: "expired" });
    prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
    const res = mockResponse();

    await getPaymentStatus(
      mockRequest({ params: { id: "payment-1" } }),
      res,
      vi.fn()
    );

    expect(prismaMock.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "payment-1", status: "pending" },
      data: { status: "expired" },
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ status: "expired" }),
      })
    );
  });

  it("acknowledges duplicate completed webhooks without double-processing", async () => {
    prismaMock.payment.findFirst.mockResolvedValue({
      id: "payment-1",
      status: "completed",
      amount: 39.99,
      currency: "USD",
    });
    const res = mockResponse();

    await handleWebhook(
      mockRequest({
        params: { gateway: "khqr" },
        body: { gatewayRef: "KHQR-1", status: "success", amount: 39.99 },
      }),
      res,
      vi.fn()
    );

    expect(prismaMock.payment.updateMany).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Payment already finalized",
    });
  });

  it("marks a payment failed when the webhook reports failure", async () => {
    prismaMock.payment.findFirst.mockResolvedValue({
      id: "payment-1",
      status: "pending",
      amount: 39.99,
      currency: "USD",
      course: { id: "course-1" },
    });
    prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
    const res = mockResponse();

    await handleWebhook(
      mockRequest({
        params: { gateway: "khqr" },
        body: { gatewayRef: "KHQR-1", status: "failed" },
      }),
      res,
      vi.fn()
    );

    expect(prismaMock.payment.updateMany).toHaveBeenCalledWith({
      where: {
        id: "payment-1",
        status: { notIn: ["completed", "refunded"] },
      },
      data: { status: "failed" },
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Webhook processed",
    });
  });
});
