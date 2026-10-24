import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createLessonSchema,
  updateLessonSchema,
  reorderLessonsSchema,
} from "../validations/lesson.schema";
import {
  getLessonsByModule,
  createLesson,
  getLessonById,
  updateLesson,
  deleteLesson,
  reorderLessons,
} from "../controllers/lesson.controller";

const router = Router({ mergeParams: true });

// Nested under /courses/:courseId/modules/:moduleId/lessons
router.get("/", getLessonsByModule);
router.post(
  "/",
  authenticate,
  authorize("INSTRUCTOR", "ADMIN"),
  validate(createLessonSchema),
  createLesson
);
router.post(
  "/reorder",
  authenticate,
  authorize("INSTRUCTOR", "ADMIN"),
  validate(reorderLessonsSchema),
  reorderLessons
);

export { router as lessonRouter };

// Separate router for /lessons/:id
export const lessonDetailRouter = Router();

lessonDetailRouter.get("/:id", getLessonById);
lessonDetailRouter.patch(
  "/:id",
  authenticate,
  authorize("INSTRUCTOR", "ADMIN"),
  validate(updateLessonSchema),
  updateLesson
);
lessonDetailRouter.delete(
  "/:id",
  authenticate,
  authorize("INSTRUCTOR", "ADMIN"),
  deleteLesson
);
