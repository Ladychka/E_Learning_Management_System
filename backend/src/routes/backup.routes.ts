import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { getBackupStatus, exportDatabaseSnapshot } from "../controllers/backup.controller";

export const backupRouter = Router();

backupRouter.get("/backup/status", authenticate, authorize("ADMIN"), getBackupStatus);
backupRouter.get("/backup/export", authenticate, authorize("ADMIN"), exportDatabaseSnapshot);
