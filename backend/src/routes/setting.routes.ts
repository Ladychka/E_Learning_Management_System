import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  getPublicSettings,
  getAllSettings,
  updateSettings,
} from "../controllers/setting.controller";

export const settingRouter = Router();

settingRouter.get("/settings/public", getPublicSettings);
settingRouter.get("/settings", authenticate, authorize("ADMIN"), getAllSettings);
settingRouter.put("/settings", authenticate, authorize("ADMIN"), updateSettings);
