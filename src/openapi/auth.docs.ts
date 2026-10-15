// src/openapi/auth.docs.ts
import { z } from "zod";
import { registry, bearerAuth, successEnvelope, errorResponses, pick, jsonContent, ErrorResponseSchema } from "./registry";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../validators/auth.validator";

// Mirrors IUser in models/user.model.ts (passwordHash is stripped before responding)
const UserSchema = z.object({
  _id: z.string().openapi({ example: "665f1c2e8b3e4a0012ab34cd" }),
  firstName: z.string().openapi({ example: "Jane" }),
  lastName: z.string().openapi({ example: "Doe" }),
  email: z.string().openapi({ example: "jane@example.com" }),
  role: z.enum(["admin", "supervisor", "instructor", "student"]).openapi({ example: "student" }),
  isActive: z.boolean().openapi({ example: true }),
  mustChangePassword: z.boolean().openapi({
    example: true,
    description: "When true the user must call POST /auth/password/change before using other endpoints",
  }),
  learningStreak: z.number().optional().openapi({ example: 0 }),
  createdAt: z.string().openapi({ example: "2026-10-15T09:00:00.000Z" }),
  updatedAt: z.string().openapi({ example: "2026-10-15T09:00:00.000Z" }),
});

const AuthUserSchema = z.object({
  user: UserSchema,
  accessToken: z.string().openapi({ example: "eyJhbGciOiJIUzI1NiIs..." }),
});

const EmptyDataSchema = z.object({}).openapi({ example: {} });

export function registerAuthDocs() {
  registry.registerPath({
    method: "post",
    path: "/auth/login",
    tags: ["Auth"],
    description:
      "Email is case-insensitive. If `user.mustChangePassword` is true, send the user to change their password first. " +
      "Limited to 10 failed attempts per IP+email and 50 per IP every 15 minutes.",
    request: { body: { content: { "application/json": { schema: loginSchema } } } },
    responses: {
      200: successEnvelope(AuthUserSchema, "Logged in successfully"),
      400: jsonContent(ErrorResponseSchema, "Validation error or invalid credentials"),
      403: jsonContent(ErrorResponseSchema, "Account deactivated"),
      ...pick(errorResponses, 429),
    },
  });

  registry.registerPath({
    method: "post",
    path: "/auth/password/reset",
    tags: ["Auth"],
    description:
      "Emails a 6-digit code valid for 5 minutes. Returns 200 even for unknown emails. " +
      "Limited to 5 requests per IP+email and 30 per IP each hour.",
    request: { body: { content: { "application/json": { schema: forgotPasswordSchema } } } },
    responses: {
      200: successEnvelope(EmptyDataSchema, "Password reset mail sent successfully"),
      409: jsonContent(ErrorResponseSchema, "A code was already sent and is still valid"),
      ...pick(errorResponses, 400, 429),
    },
  });

  registry.registerPath({
    method: "put",
    path: "/auth/password/reset",
    tags: ["Auth"],
    description:
      "New password: 8-128 chars with uppercase, lowercase, number and special character. " +
      "Limited to 10 failed attempts per email every 15 minutes.",
    request: { body: { content: { "application/json": { schema: resetPasswordSchema } } } },
    responses: {
      200: successEnvelope(EmptyDataSchema, "Password reset successfully"),
      400: jsonContent(ErrorResponseSchema, "Validation error, invalid or expired code"),
      ...pick(errorResponses, 404, 429),
    },
  });

  registry.registerPath({
    method: "post",
    path: "/auth/password/change",
    tags: ["Auth"],
    security: [{ [bearerAuth.name]: [] }],
    description:
      "Allowed while `mustChangePassword` is true and clears it. New password: 8-128 chars with uppercase, lowercase, " +
      "number and special character, and different from the old one.",
    request: { body: { content: { "application/json": { schema: changePasswordSchema } } } },
    responses: {
      200: successEnvelope(EmptyDataSchema, "Password changed successfully"),
      400: jsonContent(ErrorResponseSchema, "Validation error or wrong old password"),
      401: errorResponses[401],
      403: jsonContent(ErrorResponseSchema, "Account deactivated"),
    },
  });
}