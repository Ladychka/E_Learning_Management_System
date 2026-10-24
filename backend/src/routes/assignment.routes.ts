import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  getSubmissions,
  gradeSubmission,
} from "../controllers/assignment.controller";
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  submitAssignmentSchema,
  gradeSubmissionSchema,
} from "../validations/assignment.schema";

export const assignmentRouter = Router();

// Assignment CRUD (instructor/admin)
assignmentRouter.post("/", authenticate, authorize("ADMIN", "INSTRUCTOR"), validate(createAssignmentSchema), createAssignment);
assignmentRouter.get("/", authenticate, getAssignments);
assignmentRouter.get("/:id", authenticate, getAssignmentById);
assignmentRouter.patch("/:id", authenticate, authorize("ADMIN", "INSTRUCTOR"), validate(updateAssignmentSchema), updateAssignment);
assignmentRouter.delete("/:id", authenticate, authorize("ADMIN", "INSTRUCTOR"), deleteAssignment);

// Submissions (students submit, instructors grade)
assignmentRouter.post("/:id/submit", authenticate, authorize("STUDENT"), validate(submitAssignmentSchema), submitAssignment);
assignmentRouter.get("/:id/submissions", authenticate, authorize("ADMIN", "INSTRUCTOR"), getSubmissions);
assignmentRouter.post("/submissions/:id/grade", authenticate, authorize("ADMIN", "INSTRUCTOR"), validate(gradeSubmissionSchema), gradeSubmission);
