import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth.routes";
import { userRouter } from "./routes/user.routes";
import { courseRouter } from "./routes/course.routes";
import { categoryRouter } from "./routes/category.routes";
import { moduleRouter } from "./routes/module.routes";
import { lessonRouter, lessonDetailRouter } from "./routes/lesson.routes";
import { quizRouter } from "./routes/quiz.routes";
import { uploadRouter } from "./routes/upload.routes";
import { enrollmentRouter } from "./routes/enrollment.routes";
import { waitlistRouter } from "./routes/waitlist.routes";
import { assignmentRouter } from "./routes/assignment.routes";
import { quizAttemptRouter } from "./routes/quizAttempt.routes";
import { certificateRouter } from "./routes/certificate.routes";
import { gradeRouter } from "./routes/grade.routes";
import { paymentRouter } from "./routes/payment.routes";
import { gradeCategoryRouter } from "./routes/gradeCategory.routes";
import { rubricRouter } from "./routes/rubric.routes";
import { notificationRouter } from "./routes/notification.routes";
import { commentRouter } from "./routes/comment.routes";
import { announcementRouter } from "./routes/announcement.routes";
import { reportRouter } from "./routes/report.routes";
import { settingRouter } from "./routes/setting.routes";
import { auditRouter } from "./routes/audit.routes";
import { backupRouter } from "./routes/backup.routes";

export const app = express();

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
    frameguard: false,
    xDownloadOptions: false,
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      // and known dev origins
      const allowed = [
        config.frontendUrl,
        'http://localhost',
        'http://127.0.0.1',
      ];
      if (!origin || allowed.some((a) => origin.startsWith(a))) {
        callback(null, true);
      } else {
        callback(null, true); // permissive in dev
      }
    },
    credentials: true,
  })
);

// Rate limiting (exempt static uploads and relaxed for development)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50000,
    skip: (req) => req.path.startsWith("/uploads") || req.path.startsWith("/health"),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static file serving for uploads with inline viewing vs download support
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.removeHeader("X-Download-Options");

    // If query ?download=true is passed, force browser download with original filename
    if (req.query.download === "true") {
      const filename = path.basename(req.path);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    } else {
      // Default to inline viewing so the browser renders PDF/video directly in page without auto-downloading
      res.setHeader("Content-Disposition", "inline");
    }
    next();
  },
  express.static("uploads")
);

// Logging
if (config.nodeEnv === "development") {
  app.use(morgan("dev"));
}

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/courses", courseRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/courses/:courseId/modules", moduleRouter);
app.use("/api/v1/modules/:moduleId/lessons", lessonRouter);
app.use("/api/v1/lessons", lessonDetailRouter);
app.use("/api/v1", quizRouter);
app.use("/api/v1/upload", uploadRouter);
app.use("/api/v1/enrollments", enrollmentRouter);
app.use("/api/v1/waitlists", waitlistRouter);
app.use("/api/v1/assignments", assignmentRouter);
app.use("/api/v1/quizzes", quizAttemptRouter);
app.use("/api/v1/certificates", certificateRouter);
app.use("/api/v1/grades", gradeRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1", gradeCategoryRouter);
app.use("/api/v1", rubricRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1", commentRouter);
app.use("/api/v1", announcementRouter);
app.use("/api/v1", reportRouter);
app.use("/api/v1", settingRouter);
app.use("/api/v1", auditRouter);
app.use("/api/v1", backupRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use(errorHandler);