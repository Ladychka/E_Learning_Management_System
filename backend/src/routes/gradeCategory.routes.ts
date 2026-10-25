import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  getGradeCategories,
  createGradeCategory,
  updateGradeCategory,
  deleteGradeCategory,
  getOverallGrades,
} from "../controllers/gradeCategory.controller";
import {
  createGradeCategorySchema,
  updateGradeCategorySchema,
} from "../validations/gradeCategory.schema";

export const gradeCategoryRouter = Router();

gradeCategoryRouter.get("/courses/:courseId/grade-categories", authenticate, getGradeCategories);
gradeCategoryRouter.post(
  "/courses/:courseId/grade-categories",
  authenticate,
  authorize("ADMIN", "INSTRUCTOR"),
  validate(createGradeCategorySchema),
  createGradeCategory
);
gradeCategoryRouter.patch("/grade-categories/:id", authenticate, authorize("ADMIN", "INSTRUCTOR"), validate(updateGradeCategorySchema), updateGradeCategory);
gradeCategoryRouter.delete("/grade-categories/:id", authenticate, authorize("ADMIN", "INSTRUCTOR"), deleteGradeCategory);
gradeCategoryRouter.patch("/:id", authenticate, authorize("ADMIN", "INSTRUCTOR"), validate(updateGradeCategorySchema), updateGradeCategory);
gradeCategoryRouter.delete("/:id", authenticate, authorize("ADMIN", "INSTRUCTOR"), deleteGradeCategory);
gradeCategoryRouter.get("/courses/:courseId/overall-grades", authenticate, getOverallGrades);
