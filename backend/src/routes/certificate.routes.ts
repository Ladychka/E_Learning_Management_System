import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  issueCertificate,
  getCertificate,
  getCertificateByNumber,
  getMyCertificates,
} from "../controllers/certificate.controller";

export const certificateRouter = Router();

// Public/verified lookup (no auth required for verification)
certificateRouter.get("/verify/:number", getCertificateByNumber);

// Student routes
certificateRouter.get("/my-certificates", authenticate, authorize("STUDENT"), getMyCertificates);
certificateRouter.get("/:id", authenticate, getCertificate);

// Admin / Instructor routes
certificateRouter.post("/issue/:enrollmentId", authenticate, authorize("ADMIN", "INSTRUCTOR"), issueCertificate);
