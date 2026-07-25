// src/openapi/auth.docs.ts
import { z } from "zod";
import { registry, bearerAuth, successEnvelope, errorResponses, pick } from "./registry";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../validators/auth.validator";

// GUESS — paste models/user.model.ts so I can replace this with the real IUser shape.
const UserSchema = z.object({
  id: z.string().openapi({ example: "clv9x...abc" }),
  email: z.string().openapi({ example: "jane@example.com" }),
  role: z.string().openapi({ example: "student" }),
});

const AuthUserSchema = z.object({
  user: UserSchema,
  accessToken: z.string().openapi({ example: "eyJhbGciOiJIUzI1NiIs..." }),
});

const EmptyDataSchema = z.object({}).openapi({ example: {} });

export function registerAuthDocs() {
  registry.registerPath({
    method: "post",
    path: "/login",
    tags: ["Auth"],
    request: { body: { content: { "application/json": { schema: loginSchema } } } },
    responses: {
      200: successEnvelope(AuthUserSchema, "Logged in successfully"),
      ...pick(errorResponses, 400, 401),
    },
  });

  registry.registerPath({
    method: "post",
    path: "/password/reset",
    tags: ["Auth"],
    request: { body: { content: { "application/json": { schema: forgotPasswordSchema } } } },
    responses: {
      200: successEnvelope(EmptyDataSchema, "Password reset mail sent successfully"),
      ...pick(errorResponses, 400, 404),
    },
  });

  registry.registerPath({
    method: "put",
    path: "/password/reset",
    tags: ["Auth"],
    request: { body: { content: { "application/json": { schema: resetPasswordSchema } } } },
    responses: {
      200: successEnvelope(EmptyDataSchema, "Password reset successfully"),
      ...pick(errorResponses, 400, 404),
    },
  });

  registry.registerPath({
    method: "post",
    path: "/password/change",
    tags: ["Auth"],
    security: [{ [bearerAuth.name]: [] }],
    request: { body: { content: { "application/json": { schema: changePasswordSchema } } } },
    responses: {
      200: successEnvelope(EmptyDataSchema, "Password changed successfully"),
      ...pick(errorResponses, 400, 401),
    },
  });
}