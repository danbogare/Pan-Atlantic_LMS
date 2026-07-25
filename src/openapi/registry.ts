// src/openapi/registry.ts
import { extendZodWithOpenApi, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// This must run once, before any schema in the app calls `.openapi(...)`.
// Importing this file (even just for its side effect) is enough — but to be
// safe, import it at the very top of your app's entrypoint too.
extendZodWithOpenApi(z);

// One shared registry the whole app registers routes/schemas against.
export const registry = new OpenAPIRegistry();

// Common reusable pieces so every *.docs.ts file stays short.
export const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

export const ErrorResponseSchema = registry.register(
  "ErrorResponse",
  z.object({
    success: z.literal(false).openapi({ example: false }),
    message: z.string().openapi({ example: "Course not found" }),
    stack: z
      .string()
      .optional()
      .openapi({ description: "Only present when NODE_ENV=development" }),
  })
);

export const jsonContent = <T extends z.ZodTypeAny>(schema: T, description: string) => ({
  description,
  content: {
    "application/json": { schema },
  },
});

// Matches utils/response.ts: successResponse/createdSuccessResponse both send
// { success: true, message, data }. Pass the shape of `data` and get the
// full envelope back.
export const successEnvelope = <T extends z.ZodTypeAny>(dataSchema: T, description: string) =>
  jsonContent(
    z.object({
      success: z.literal(true).openapi({ example: true }),
      message: z.string().openapi({ example: "Request successful" }),
      data: dataSchema,
    }),
    description
  );

export const errorResponses = {
  400: jsonContent(ErrorResponseSchema, "Validation error"),
  401: jsonContent(ErrorResponseSchema, "Not authenticated"),
  403: jsonContent(ErrorResponseSchema, "Not authorized (admin/instructor only)"),
  404: jsonContent(ErrorResponseSchema, "Not found"),
  409: jsonContent(ErrorResponseSchema, "Conflict (e.g. resource already exists)"),
  500: jsonContent(ErrorResponseSchema, "Internal server error"),
};

// Handy when a route only needs a subset, e.g. { ...pick(errorResponses, 400, 401, 404) }
export function pick<T extends Record<string, unknown>>(obj: T, ...codes: (keyof T)[]) {
  return Object.fromEntries(codes.map((c) => [c, obj[c]])) as Partial<T>;
}