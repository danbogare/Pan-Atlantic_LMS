// src/openapi/user.docs.ts
import { registry, bearerAuth, successEnvelope, errorResponses, pick } from "./registry";
import { updateProfileSchema } from "../validators/user.validator";
import { UserSchema } from "./auth.docs";

export function registerUserDocs() {
  registry.registerPath({
    method: "get",
    path: "/users/me",
    tags: ["Profile"],
    summary: "Get my profile",
    description: "Any logged-in user. Also works while `mustChangePassword` is true.",
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: successEnvelope(UserSchema, "Profile retrieved"),
      ...pick(errorResponses, 401, 403, 404),
    },
  });

  registry.registerPath({
    method: "patch",
    path: "/users/me",
    tags: ["Profile"],
    summary: "Update my profile",
    description:
      "Any logged-in user can update their own first and/or last name (at least one). " +
      "Email, role and account status can only be changed by an admin. To change password use `POST /auth/password/change`.",
    security: [{ [bearerAuth.name]: [] }],
    request: { body: { content: { "application/json": { schema: updateProfileSchema } } } },
    responses: {
      200: successEnvelope(UserSchema, "Profile updated"),
      ...pick(errorResponses, 400, 401, 403, 404),
    },
  });
}
