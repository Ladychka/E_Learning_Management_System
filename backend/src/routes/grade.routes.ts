import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createGrade,
  getGrades,
  getGradeById,
  updateGrade,
  deleteGrade,
  publishGrade,
  getMyGrades,
  exportGradebook,
  appealGrade,
  respondAppeal,
  getCourseGPA,
  getGradebookOverview,
} from "../controllers/grade.controller";
import {
  createGradeSchema,
  updateGradeSchema,
  appealGradeSchema,
  respondAppealSchema,
} from "../validations/grade.schema";

export const gradeRouter = Router();

gradeRouter.post(
  "/",
  authenticate,
  authorize("ADMIN", "INSTRUCTOR"),
  validate(createGradeSchema),
  createGrade
);
gradeRouter.get(
  "/",
  authenticate,
  getGrades
);
gradeRouter.get(
  "/overview",
  authenticate,
  authorize("ADMIN", "INSTRUCTOR"),
  getGradebookOverview
);
gradeRouter.get(
  "/export",
  authenticate,
  authorize("ADMIN", "INSTRUCTOR"),
  exportGradebook
);
gradeRouter.get(
  "/my-grades",
  authenticate,
  getMyGrades
);
gradeRouter.get(
  "/course/:courseId/gpa",
  authenticate,
  getCourseGPA
);
gradeRouter.get(
  "/:id",
  authenticate,
  getGradeById
);
gradeRouter.patch(
  "/:id",
  authenticate,
  authorize("ADMIN", "INSTRUCTOR"),
  validate(updateGradeSchema),
  updateGrade
);
gradeRouter.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  deleteGrade
);
gradeRouter.post(
  "/:id/publish",
  authenticate,
  authorize("ADMIN", "INSTRUCTOR"),
  publishGrade
);
gradeRouter.post(
  "/:id/appeal",
  authenticate,
  validate(appealGradeSchema),
  appealGrade
);
gradeRouter.patch(
  "/appeals/:id",
  authenticate,
  authorize("ADMIN", "INSTRUCTOR"),
  validate(respondAppealSchema),
  respondAppeal
);
