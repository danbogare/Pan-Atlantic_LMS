import { z } from "zod";
import { BadRequestError } from "../errors/error";

// Validates req.query against a schema (Express 5's req.query is read-only, so this returns the parsed copy)
export function parseQuery<T extends z.ZodTypeAny>(schema: T, query: unknown): z.infer<T> {
  const result = schema.safeParse(query);
  if (!result.success) {
    throw new BadRequestError(result.error.issues[0]?.message || "Invalid query parameters");
  }
  return result.data;
}
