import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  getCourseAnnouncements,
  getMyAnnouncements,
  createAnnouncement,
  markAnnouncementRead,
  deleteAnnouncement,
} from "../controllers/announcement.controller";

export const announcementRouter = Router({ mergeParams: true });

announcementRouter.get("/announcements/my", authenticate, getMyAnnouncements);
announcementRouter.get("/courses/:courseId/announcements", authenticate, getCourseAnnouncements);
announcementRouter.post(
  "/courses/:courseId/announcements",
  authenticate,
  authorize("ADMIN", "INSTRUCTOR"),
  createAnnouncement
);
announcementRouter.post("/announcements", authenticate, authorize("ADMIN"), createAnnouncement);
announcementRouter.post("/announcements/:id/read", authenticate, markAnnouncementRead);
announcementRouter.delete(
  "/announcements/:id",
  authenticate,
  authorize("ADMIN", "INSTRUCTOR"),
  deleteAnnouncement
);
