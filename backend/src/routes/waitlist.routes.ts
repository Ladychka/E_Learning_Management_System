import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  joinWaitlist,
  leaveWaitlist,
  processWaitlist,
  getWaitlists,
  getMyWaitlists,
} from "../controllers/waitlist.controller";
import { createWaitlistSchema, processWaitlistSchema } from "../validations/waitlist.schema";

export const waitlistRouter = Router();

// Student routes
waitlistRouter.post("/join", authenticate, validate(createWaitlistSchema), joinWaitlist);
waitlistRouter.get("/my-waitlists", authenticate, getMyWaitlists);
waitlistRouter.delete("/:id", authenticate, leaveWaitlist);

// Admin / Instructor routes
waitlistRouter.get("/", authenticate, authorize("ADMIN", "INSTRUCTOR"), getWaitlists);
waitlistRouter.patch("/:id/process", authenticate, authorize("ADMIN", "INSTRUCTOR"), validate(processWaitlistSchema), processWaitlist);
