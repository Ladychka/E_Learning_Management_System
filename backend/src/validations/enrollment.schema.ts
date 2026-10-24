import { z } from "zod";

export const createEnrollmentSchema = z.object({
  userId: z.string().uuid().optional(), // optional for self-enroll; admin can specify
  courseId: z.string().uuid(),
  expiresAt: z.string().datetime().optional(),
});

export const updateEnrollmentSchema = z.object({
  status: z.enum(["active", "completed", "dropped", "expired"]).optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const bulkEnrollSchema = z.object({
  courseId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).min(1),
});

export const enrollmentQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(["active", "completed", "dropped", "expired"]).optional(),
  courseId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
});
