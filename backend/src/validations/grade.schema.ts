import { z } from "zod";

export const createGradeSchema = z.object({
  studentId: z.string().uuid(),
  courseId: z.string().uuid(),
  assignmentId: z.string().uuid().optional(),
  quizId: z.string().uuid().optional(),
  points: z.number().min(0),
  maxPoints: z.number().min(0).default(100),
  letterGrade: z.string().optional(),
  passFail: z.enum(["pass", "fail"]).optional(),
  feedback: z.string().optional(),
});

export const updateGradeSchema = z.object({
  points: z.number().min(0).optional(),
  maxPoints: z.number().min(0).optional(),
  letterGrade: z.string().optional(),
  passFail: z.enum(["pass", "fail"]).optional(),
  feedback: z.string().optional(),
});

export const appealGradeSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

export const respondAppealSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  response: z.string().optional(),
});

export const gradeQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  courseId: z.string().optional(),
  studentId: z.string().optional(),
  isPublished: z.string().optional(),
});
