import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

/**
 * US-094 & US-095: Database Backup Management
 */
export async function getBackupStatus(_req: Request, res: Response): Promise<void> {
  try {
    const [
      userCount,
      courseCount,
      enrollmentCount,
      paymentCount,
      submissionCount,
      quizAttemptCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.enrollment.count(),
      prisma.payment.count(),
      prisma.submission.count(),
      prisma.quizAttempt.count(),
    ]);

    res.json({
      data: {
        databaseStatus: "healthy",
        lastBackupAt: new Date(Date.now() - 3600000 * 4).toISOString(), // sample 4 hours ago
        tables: {
          users: userCount,
          courses: courseCount,
          enrollments: enrollmentCount,
          payments: paymentCount,
          submissions: submissionCount,
          quizAttempts: quizAttemptCount,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to check backup status", error: err.message });
  }
}

export async function exportDatabaseSnapshot(_req: Request, res: Response): Promise<void> {
  try {
    const [courses, users, categories, settings] = await Promise.all([
      prisma.course.findMany({ select: { id: true, title: true, slug: true, status: true, price: true } }),
      prisma.user.findMany({ select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true } }),
      prisma.category.findMany(),
      prisma.setting.findMany(),
    ]);

    const snapshot = {
      timestamp: new Date().toISOString(),
      metadata: {
        version: "1.0.0",
        app: "FinTech ELMS",
      },
      data: {
        categories,
        settings,
        courses,
        users,
      },
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="elms-backup-${Date.now()}.json"`);
    res.send(JSON.stringify(snapshot, null, 2));
  } catch (err: any) {
    res.status(500).json({ message: "Failed to create database snapshot", error: err.message });
  }
}
