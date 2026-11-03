import multer from "multer";
import path from "path";
import { AppError } from "../middleware/errorHandler";

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const folder = path.basename(req.params.folder || "documents");
    const dest = path.resolve(process.cwd(), "uploads", folder);
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes: Record<string, string[]> = {
    videos: ["video/mp4", "video/webm", "video/quicktime"],
    documents: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/zip",
    ],
    thumbnails: ["image/jpeg", "image/png", "image/webp"],
    submissions: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/zip",
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
  };

  const folder = (_req as any).params?.folder || "documents";
  const allowed = allowedMimes[folder] || allowedMimes.documents;

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`File type not allowed: ${file.mimetype}`, 400) as any);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max (for video uploads)
  },
});
