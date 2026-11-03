import { Router } from "express";
import { authenticate, authorize, optionalAuthenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createCourseSchema,
  updateCourseSchema,
  courseQuerySchema,
} from "../validations/course.schema";
import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} from "../controllers/course.controller";

const router = Router();

router.get("/", optionalAuthenticate, validate(courseQuerySchema), getCourses);
router.get("/:id", optionalAuthenticate, getCourseById);
router.post(
  "/",
  authenticate,
  authorize("INSTRUCTOR", "ADMIN"),
  validate(createCourseSchema),
  createCourse
);
router.patch(
  "/:id",
  authenticate,
  authorize("INSTRUCTOR", "ADMIN"),
  validate(updateCourseSchema),
  updateCourse
);
router.delete(
  "/:id",
  authenticate,
  authorize("INSTRUCTOR", "ADMIN"),
  deleteCourse
);

export { router as courseRouter };