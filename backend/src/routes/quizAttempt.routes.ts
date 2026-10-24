import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  startQuizAttempt,
  submitQuizAnswers,
  getQuizResults,
  getMyQuizAttempts,
  getQuizAttemptStatus,
} from "../controllers/quizAttempt.controller";
import {
  startQuizAttemptSchema,
  submitAnswerSchema,
} from "../validations/quizAttempt.schema";

export const quizAttemptRouter = Router();

// Quiz taking (students)
quizAttemptRouter.post(
  "/attempts",
  authenticate,
  authorize("STUDENT"),
  validate(startQuizAttemptSchema),
  startQuizAttempt
);
quizAttemptRouter.post(
  "/attempts/:attemptId/submit",
  authenticate,
  authorize("STUDENT"),
  validate(submitAnswerSchema.omit({ attemptId: true })),
  submitQuizAnswers
);
quizAttemptRouter.get("/attempts/:attemptId/results", authenticate, getQuizResults);
quizAttemptRouter.get("/my-attempts", authenticate, authorize("STUDENT"), getMyQuizAttempts);
quizAttemptRouter.get("/:quizId/status", authenticate, getQuizAttemptStatus);
