import { z } from "zod";

export const startQuizAttemptSchema = z.object({
  quizId: z.string().uuid(),
});

export const submitAnswerSchema = z.object({
  attemptId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      answer: z.string(),
    })
  ),
});

export const quizAttemptQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  quizId: z.string().uuid().optional(),
});
