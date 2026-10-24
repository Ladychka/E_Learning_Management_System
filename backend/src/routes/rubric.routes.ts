import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  getRubricByAssignment,
  createOrUpdateRubric,
  deleteRubric,
  submitRubricGrades,
  getRubricGrades,
} from "../controllers/rubric.controller";
import {
  createRubricSchema,
  submitRubricGradesSchema,
} from "../validations/rubric.schema";

export const rubricRouter = Router();

rubricRouter.get("/assignments/:assignmentId/rubric", authenticate, getRubricByAssignment);
rubricRouter.post(
  "/assignments/:assignmentId/rubric",
  authenticate,
  authorize("ADMIN", "INSTRUCTOR"),
  validate(createRubricSchema),
  createOrUpdateRubric
);
rubricRouter.delete("/rubrics/:id", authenticate, authorize("ADMIN", "INSTRUCTOR"), deleteRubric);
rubricRouter.post(
  "/grades/:gradeId/rubric-grades",
  authenticate,
  authorize("ADMIN", "INSTRUCTOR"),
  validate(submitRubricGradesSchema),
  submitRubricGrades
);
rubricRouter.get("/grades/:gradeId/rubric-grades", authenticate, getRubricGrades);
