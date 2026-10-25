import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { getAuditLogs } from "../controllers/audit.controller";

export const auditRouter = Router();

auditRouter.get("/audit-logs", authenticate, authorize("ADMIN"), getAuditLogs);
