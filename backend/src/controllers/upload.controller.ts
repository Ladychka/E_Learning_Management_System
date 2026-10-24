import { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(path.join(UPLOAD_DIR, "videos"), { recursive: true });
  fs.mkdirSync(path.join(UPLOAD_DIR, "documents"), { recursive: true });
  fs.mkdirSync(path.join(UPLOAD_DIR, "thumbnails"), { recursive: true });
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
    const allowedFolders = ["videos", "documents", "thumbnails"];
    if (!allowedFolders.includes(folder)) {
      throw new AppError("Invalid upload folder", 400);
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
    const filePath = path.join(UPLOAD_DIR, folder, filename);

    if (!fs.existsSync(filePath)) {
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
