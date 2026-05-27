// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("[Error]", err.message);

  // Multer file size error
  if (err.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ success: false, message: "File too large. Max 10MB." });
    return;
  }

  // Multer file type error
  if (err.message?.includes("Only PDF")) {
    res.status(400).json({ success: false, message: err.message });
    return;
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal server error",
  });
}