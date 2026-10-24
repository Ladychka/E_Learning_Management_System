import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createModuleSchema,
  updateModuleSchema,
  reorderModulesSchema,
} from "../validations/module.schema";
import {
  getModulesByCourse,
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
} from "../controllers/module.controller";

const router = Router({ mergeParams: true });

router.get("/", getModulesByCourse);
router.post(
  "/",
  authenticate,
  authorize("INSTRUCTOR", "ADMIN"),
  validate(createModuleSchema),
  createModule
);
router.patch(
  "/:id",
  authenticate,
  authorize("INSTRUCTOR", "ADMIN"),
  validate(updateModuleSchema),
  updateModule
);
router.delete(
  "/:id",
  authenticate,
  authorize("INSTRUCTOR", "ADMIN"),
  deleteModule
);
router.post(
  "/reorder",
  authenticate,
  authorize("INSTRUCTOR", "ADMIN"),
  validate(reorderModulesSchema),
  reorderModules
);

export { router as moduleRouter };
