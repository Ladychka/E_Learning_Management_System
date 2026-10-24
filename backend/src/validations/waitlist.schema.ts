import { z } from "zod";

export const createWaitlistSchema = z.object({
  courseId: z.string().uuid(),
});

export const processWaitlistSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  notes: z.string().max(500).optional(),
});

export const waitlistQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected", "converted"]).optional(),
  courseId: z.string().uuid().optional(),
});
