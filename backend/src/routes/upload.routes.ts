import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { upload } from "../lib/multer";
import { uploadFile, serveFile } from "../controllers/upload.controller";

const router = Router();

router.post(
  "/:folder",
  authenticate,
  upload.single("file"),
  uploadFile
);

router.get("/:folder/:filename", serveFile);

export { router as uploadRouter };
