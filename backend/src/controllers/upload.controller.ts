import { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

const ALLOWED_FOLDERS = ["videos", "documents", "thumbnails", "submissions"];
// Folders that any authenticated user may upload to (e.g. assignment files).
const STUDENT_UPLOAD_FOLDERS = ["submissions"];

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
for (const folder of ALLOWED_FOLDERS) {
  const folderPath = path.join(UPLOAD_DIR, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

export const uploadFile = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      throw new AppError("No file uploaded", 400);
    }

    const { folder = "documents" } = req.params;
    if (!ALLOWED_FOLDERS.includes(folder)) {
      throw new AppError("Invalid upload folder", 400);
    }

    // Course media is instructor/admin only; students can upload assignment
    // files to the dedicated submissions folder.
    if (
      !STUDENT_UPLOAD_FOLDERS.includes(folder) &&
      req.user?.role !== "INSTRUCTOR" &&
      req.user?.role !== "ADMIN"
    ) {
      throw new AppError("Insufficient permissions", 403);
    }

    const relativePath = `/uploads/${folder}/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        url: relativePath,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const serveFile = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { folder, filename } = req.params;

    // Prevent path traversal: only allow a single, whitelisted folder segment
    // and a basename filename that stays inside the uploads directory.
    if (
      !ALLOWED_FOLDERS.includes(folder) ||
      path.basename(filename) !== filename
    ) {
      throw new AppError("Invalid file path", 400);
    }

    const filePath = path.resolve(UPLOAD_DIR, folder, filename);
    if (!filePath.startsWith(`${UPLOAD_DIR}${path.sep}`)) {
      throw new AppError("Invalid file path", 400);
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      throw new AppError("File not found", 404);
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const ext = path.extname(filename).toLowerCase();
    const isVideo = [".mp4", ".webm", ".ogg", ".mov", ".mkv"].includes(ext);

    if (range && isVideo) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": getMimeType(ext),
      });

      fileStream.pipe(res);
      return;
    }

    // For non-video or non-range requests, send the whole file
    res.setHeader("Content-Length", fileSize);
    res.setHeader("Content-Type", getMimeType(ext));
    if (isVideo) {
      res.setHeader("Accept-Ranges", "bytes");
    }
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".ogg": "video/ogg",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  return map[ext] || "application/octet-stream";
}
