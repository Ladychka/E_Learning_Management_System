import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from "../controllers/notification.controller";

export const notificationRouter = Router();

notificationRouter.get("/my", authenticate, getMyNotifications);
notificationRouter.patch("/:id/read", authenticate, markAsRead);
notificationRouter.patch("/read-all", authenticate, markAllAsRead);
notificationRouter.get("/unread-count", authenticate, getUnreadCount);
