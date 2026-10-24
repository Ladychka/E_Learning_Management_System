import { z } from "zod";

export const createAssignmentSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  instructions: z.string().optional(),
  maxPoints: z.number().int().min(1).max(1000).optional(),
  dueDate: z.string().datetime().optional(),
  allowLate: z.boolean().optional(),
  attachments: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
});

export const updateAssignmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  maxPoints: z.number().int().min(1).max(1000).optional(),
  dueDate: z.string().datetime().optional(),
  allowLate: z.boolean().optional(),
  attachments: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
  isPublished: z.boolean().optional(),
});

export const submitAssignmentSchema = z.object({
  content: z.string().optional(),
  fileUrls: z.array(z.string().url()).optional(),
});

export const gradeSubmissionSchema = z.object({
  points: z.number().min(0),
  feedback: z.string().optional(),
});

export const assignmentQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  courseId: z.string().uuid().optional(),
});
