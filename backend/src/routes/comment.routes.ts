import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getLessonComments,
  createComment,
  deleteComment,
} from "../controllers/comment.controller";

export const commentRouter = Router({ mergeParams: true });

commentRouter.get("/lessons/:lessonId/comments", authenticate, getLessonComments);
commentRouter.post("/lessons/:lessonId/comments", authenticate, createComment);
commentRouter.delete("/comments/:id", authenticate, deleteComment);
