import { z } from "zod";

export const createQuizSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  timeLimit: z.number().int().min(1).optional(),
  maxAttempts: z.number().int().min(1).optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  isPublished: z.boolean().optional(),
});

export const createQuestionSchema = z.object({
  type: z.enum(["MCQ", "TRUE_FALSE", "SHORT_ANSWER"]),
  question: z.string().min(1).max(1000),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  points: z.number().int().min(1).default(1),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateQuestionSchema = createQuestionSchema.partial();

export const reorderQuestionsSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    })
  ).min(1),
});
