import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "../utils/audit";

function generateCertificateNumber(): string {
  const prefix = "ELMS";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export const issueCertificate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { enrollmentId } = req.params;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { user: true, course: { include: { instructor: true } } },
    });
    if (!enrollment) throw new AppError("Enrollment not found", 404);

    // Only completed enrollments can get certificates
    if (enrollment.status !== "completed") {
      throw new AppError("Course must be completed before issuing a certificate", 400);
    }

    // Check if certificate already exists
    const existing = await prisma.certificate.findFirst({
      where: { enrollmentId },
    });
    if (existing) {
      res.json({ success: true, data: existing, message: "Certificate already issued" });
      return;
    }

    const certificate = await prisma.certificate.create({
      data: {
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        enrollmentId,
        certificateNumber: generateCertificateNumber(),
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        course: { select: { title: true } },
      },
    });

    // Update enrollment with certificate URL reference
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { certificateUrl: `/api/v1/certificates/${certificate.id}` },
    });

    await logAudit({
      userId: req.user?.id,
      action: "ISSUE_CERTIFICATE",
      entity: "Certificate",
      entityId: certificate.id,
      newValues: { enrollmentId, certificateNumber: certificate.certificateNumber },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({ success: true, data: certificate });
  } catch (error) {
    next(error);
  }
};

export const getCertificate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const certificate = await prisma.certificate.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true, duration: true } },
        enrollment: { select: { enrolledAt: true, completedAt: true } },
      },
    });

    if (!certificate) throw new AppError("Certificate not found", 404);

    // Update download time if accessed by owner
    if (req.user?.id === certificate.userId) {
      await prisma.certificate.update({
        where: { id },
        data: { downloadedAt: new Date() },
      });
    }

    res.json({ success: true, data: certificate });
  } catch (error) {
    next(error);
  }
};

export const getCertificateByNumber = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { number } = req.params;

    const certificate = await prisma.certificate.findUnique({
      where: { certificateNumber: number },
      include: {
        user: { select: { firstName: true, lastName: true } },
        course: { select: { title: true } },
        enrollment: { select: { enrolledAt: true, completedAt: true } },
      },
    });

    if (!certificate) throw new AppError("Certificate not found", 404);

    res.json({ success: true, data: certificate });
  } catch (error) {
    next(error);
  }
};

export const getMyCertificates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = "1", limit = "10" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where: { userId: req.user!.id },
        include: {
          course: { select: { id: true, title: true, thumbnailUrl: true } },
        },
        orderBy: { issuedAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.certificate.count({ where: { userId: req.user!.id } }),
    ]);

    res.json({
      success: true,
      data: certificates,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};
