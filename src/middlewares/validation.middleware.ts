import { Request, Response, NextFunction, RequestHandler } from "express";
import { z } from "zod";
import { errorResponse } from "../utils/response";

/**
 * Validate incoming request bodies against a Zod 4 schema.
 * Using z.ZodTypeAny is the most flexible catch-all for Zod schemas in v4.
 */
export const validate = (schema: z.ZodTypeAny): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Zod 4 uses .issues instead of .errors
      const firstErrorMessage = result.error.issues[0]?.message || "Validation error";

      errorResponse(res, 400, firstErrorMessage);
      return;
    }

    // Overwrite req.body with the sanitized, trimmed, and stripped data outputted by Zod.
    req.body = result.data;

    next();
  };
};