// src/openapi/admin.docs.ts
import { z } from "zod";
import { registry, bearerAuth, successEnvelope, errorResponses, pick } from "./registry";
import { enrollStudentSchema } from "../validators/student.validator";

const EmptyDataSchema = z.object({}).openapi({ example: {} });

export function registerAdminDocs() {
  registry.registerPath({
    method: "post",
    // GUESS — assumed mount prefix "/admin" from the AdminRouter class name.
    // Confirm the actual app.use("/admin", ...) prefix in your app bootstrap.
    path: "/admin/student/enroll",
    tags: ["Admin"],
    security: [{ [bearerAuth.name]: [] }],
    request: { body: { content: { "application/json": { schema: enrollStudentSchema } } } },
    responses: {
      201: successEnvelope(EmptyDataSchema, "Invite email sent successfully"),
      ...pick(errorResponses, 400, 401, 403, 409),
    },
  });

  registry.registerPath({
    method: "post",
    path: "/admin/instructor/invite",
    tags: ["Admin"],
    security: [{ [bearerAuth.name]: [] }],
    // Reuses enrollStudentSchema — same input shape (firstName/lastName/email/
    // assignedCourseIds) for inviting an instructor, per your controller.
    request: { body: { content: { "application/json": { schema: enrollStudentSchema } } } },
    responses: {
      201: successEnvelope(EmptyDataSchema, "Invite email sent successfully"),
      ...pick(errorResponses, 400, 401, 403, 409),
    },
  });
}