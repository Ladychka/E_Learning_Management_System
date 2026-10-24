import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../validations/course.schema";
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller";

const router = Router();

router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createCategorySchema),
  createCategory
);
router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(updateCategorySchema),
  updateCategory
);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteCategory);

export { router as categoryRouter };