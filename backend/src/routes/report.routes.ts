import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  getCourseCompletionStats,
  getStudentProgressReport,
  getAssessmentPerformance,
  getQuizItemAnalysis,
  getRevenueAnalytics,
  exportReportCsv,
} from "../controllers/report.controller";

export const reportRouter = Router();

reportRouter.get(
  "/reports/completion",
  authenticate,
  authorize("ADMIN", "INSTRUCTOR"),
  getCourseCompletionStats
);

reportRouter.get(
  "/reports/students",
  authenticate,
  authorize("ADMIN", "INSTRUCTOR"),
  getStudentProgressReport
);

reportRouter.get(
  "/reports/assessments/:courseId",
  authenticate,
  authorize("ADMIN", "INSTRUCTOR"),
  getAssessmentPerformance
);

reportRouter.get(
  "/reports/quizzes/:quizId/item-analysis",
  authenticate,
  authorize("ADMIN", "INSTRUCTOR"),
  getQuizItemAnalysis
);

reportRouter.get(
  "/reports/revenue",
  authenticate,
  authorize("ADMIN", "INSTRUCTOR"),
  getRevenueAnalytics
);

reportRouter.get(
  "/reports/export/:type",
  authenticate,
  authorize("ADMIN", "INSTRUCTOR"),
  exportReportCsv
);
