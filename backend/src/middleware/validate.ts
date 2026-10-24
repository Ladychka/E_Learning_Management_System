import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "./errorHandler";

export const validate = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`
      );
      return next(new AppError(`Validation failed: ${issues.join(", ")}`, 400));
    }
    next();
  };
};