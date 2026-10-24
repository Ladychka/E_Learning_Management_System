import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createQuizSchema,
  createQuestionSchema,
  updateQuestionSchema,
  reorderQuestionsSchema,
} from "../validations/quiz.schema";
import {
  getQuizByLesson,
  createOrUpdateQuiz,
  deleteQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} from "../controllers/quiz.controller";

const router = Router();

router.get("/lessons/:lessonId/quiz", authenticate, getQuizByLesson);
router.post(
  "/lessons/:lessonId/quiz",
  authenticate,
  authorize("INSTRUCTOR", "ADMIN"),
  validate(createQuizSchema),
  createOrUpdateQuiz
);
router.delete(
  "/lessons/:lessonId/quiz",
  authenticate,
  authorize("INSTRUCTOR", "ADMIN"),
  deleteQuiz
);

router.post(
  "/quizzes/:quizId/questions",
  authenticate,
  authorize("INSTRUCTOR", "ADMIN"),
  validate(createQuestionSchema),
  addQuestion
);
router.patch(
  "/quizzes/:quizId/questions/:questionId",
  authenticate,
  authorize("INSTRUCTOR", "ADMIN"),
  validate(updateQuestionSchema),
  updateQuestion
);
router.delete(
  "/quizzes/:quizId/questions/:questionId",
  authenticate,
  authorize("INSTRUCTOR", "ADMIN"),
  deleteQuestion
);
router.post(
  "/quizzes/:quizId/questions/reorder",
  authenticate,
  authorize("INSTRUCTOR", "ADMIN"),
  validate(reorderQuestionsSchema),
  reorderQuestions
);

export { router as quizRouter };
