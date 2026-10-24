import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  selfEnroll,
  adminEnroll,
  updateEnrollment,
  unenroll,
  getMyEnrollments,
  getEnrollments,
  getEnrollmentById,
  bulkEnroll,
  getEnrollmentReport,
} from "../controllers/enrollment.controller";
import {
  createEnrollmentSchema,
  bulkEnrollSchema,
} from "../validations/enrollment.schema";

export const enrollmentRouter = Router();

// Student routes
enrollmentRouter.post(
  "/enroll",
  authenticate,
  validate(createEnrollmentSchema.omit({ userId: true })),
  selfEnroll
);
enrollmentRouter.get("/my-enrollments", authenticate, getMyEnrollments);
enrollmentRouter.delete("/:id", authenticate, unenroll);

// Admin / Instructor routes
enrollmentRouter.post(
  "/",
  authenticate,
  authorize("ADMIN", "INSTRUCTOR"),
  validate(createEnrollmentSchema),
  adminEnroll
);
enrollmentRouter.patch("/:id", authenticate, authorize("ADMIN", "INSTRUCTOR"), updateEnrollment);
enrollmentRouter.get("/", authenticate, authorize("ADMIN", "INSTRUCTOR"), getEnrollments);
enrollmentRouter.get("/:id", authenticate, getEnrollmentById);
enrollmentRouter.post("/bulk", authenticate, authorize("ADMIN", "INSTRUCTOR"), validate(bulkEnrollSchema), bulkEnroll);
enrollmentRouter.get("/report/overview", authenticate, authorize("ADMIN", "INSTRUCTOR"), getEnrollmentReport);
