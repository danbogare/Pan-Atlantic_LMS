// src/openapi/admin.docs.ts
import { z } from "zod";
import { registry, bearerAuth, successEnvelope, errorResponses, pick, jsonContent, ErrorResponseSchema } from "./registry";
import { enrollStudentSchema } from "../validators/student.validator";
import { inviteInstructorSchema } from "../validators/instructor.validator";
import { updateUserInfoSchema } from "../validators/user.validator";
import { createNotificationSchema, broadcastNotificationSchema } from "../validators/notification.validator";

const EmptyDataSchema = z.object({}).openapi({ example: {} });
const IdParam = z.object({ courseId: z.string().openapi({ example: "clv9x...abc" }) });

export function registerAdminDocs() {
  registry.registerPath({
    method: "post",
    // GUESS — assumed mount prefix "/admin" from the AdminRouter class name.
    // Confirm the actual app.use("/admin", ...) prefix in your app bootstrap.
    path: "/admin/student/enroll",
    tags: ["Admin"],
    security: [{ [bearerAuth.name]: [] }],
    description:
      "Enrolls a student in **academic** courses only; professional courses are applied for and paid by the student " +
      "(`POST /courses/{courseId}/apply`). Any professional course in the list returns 400 with `code: COURSE_TYPE_NOT_ALLOWED`.\n\n" +
      "**New email:** creates the student account. No password is sent: the system generates a temporary password, emails it only " +
      "to the new user (it is never returned to the admin), and sets `mustChangePassword: true`. If enrollment fails nothing is created.\n\n" +
      "**Existing student** (e.g. self-registered, paid into the LMS account and verified by the admin): no new account and no email; " +
      "the student is just enrolled. `firstName`/`lastName` are ignored. Courses they are already in are skipped " +
      "(`alreadyEnrolledCourseIds`); 409 if they are already in all of them. 400 if the email belongs to a non-student account.\n\n" +
      "Duplicate course IDs are ignored.",
    request: { body: { content: { "application/json": { schema: enrollStudentSchema } } } },
    responses: {
      201: successEnvelope(
        z.object({
          studentId: z.string(),
          isNewAccount: z.boolean().openapi({ description: "false when the email already belonged to a student; no email is sent then" }),
          enrolledCourseIds: z.array(z.string()),
          alreadyEnrolledCourseIds: z.array(z.string()),
        }),
        "Student created and emailed, or existing student enrolled"
      ),
      404: jsonContent(ErrorResponseSchema, "One of the courses was not found"),
      ...pick(errorResponses, 400, 401, 403, 409),
    },
  });

  registry.registerPath({
    method: "post",
    path: "/admin/instructor/invite",
    tags: ["Admin"],
    security: [{ [bearerAuth.name]: [] }],
    description:
      "No password is sent: the system generates a temporary password, emails it only to the new user (it is never returned to the admin), " +
      "and sets `mustChangePassword: true`. " +
      "Duplicate course IDs are ignored; if assignment fails nothing is created.",
    request: { body: { content: { "application/json": { schema: inviteInstructorSchema } } } },
    responses: {
      201: successEnvelope(EmptyDataSchema, "Invite email sent successfully"),
      404: jsonContent(ErrorResponseSchema, "One of the courses was not found"),
      ...pick(errorResponses, 400, 401, 403, 409),
    },
  });

  registry.registerPath({
    method: "get",
    path: "/admin/students",
    tags: ["Admin"],
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: successEnvelope(z.array(z.object({})), "List of students"),
    }
  })
  
  registry.registerPath({
    method: "put",
    path: "/admin/users/{id}",
    tags: ["Admin"],
    security: [{ [bearerAuth.name]: [] }],
    request: { params: IdParam, body: { content: { "application/json": { schema: updateUserInfoSchema } } } },
    responses: {
      200: successEnvelope(z.array(z.object({})), "user details"),
    }
  })
  
  registry.registerPath({
    method: "get",
    path: "/admin/students/{studentId}",
    tags: ["Admin"],
    security: [{ [bearerAuth.name]: [] }],
    request: { params: IdParam },
    responses: {
      200: successEnvelope(z.array(z.object({})), "Student details"),
    }
  })
  
  registry.registerPath({
    method: "get",
    path: "/admin/instructors",
    tags: ["Admin"],
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: successEnvelope(z.array(z.object({})), "List of instructors"),
    }
  })
  
  registry.registerPath({
    method: "get",
    path: "/admin/instructors/{instructorId}",
    tags: ["Admin"],
    security: [{ [bearerAuth.name]: [] }],
    request: { params: IdParam },
    responses: {
      200: successEnvelope(z.array(z.object({})), "instructor details"),
    }
  })

  registry.registerPath({
      method: "post",
      // GUESS — assumed mount prefix "/notifications" from the NotificationRouter naming.
      // Confirm the actual app.use("/notifications", ...) prefix in your app bootstrap.
      path: "/admin/notifications",
      tags: ["Notifications"],
      security: [{ [bearerAuth.name]: [] }],
      request: { body: { content: { "application/json": { schema: createNotificationSchema } } } },
      responses: {
        201: successEnvelope(z.object({}), "Notification sent successfully"),
        ...pick(errorResponses, 400, 401, 403, 404),
      },
    });
  
    registry.registerPath({
      method: "post",
      path: "/admin/notifications/broadcast",
      tags: ["Notifications"],
      security: [{ [bearerAuth.name]: [] }],
      // Admin-only — targetRole omitted in the body means "broadcast to every user".
      request: { body: { content: { "application/json": { schema: broadcastNotificationSchema } } } },
      responses: {
        201: successEnvelope(z.object({ count: z.number().openapi({ example: 128 }) }), "Notification broadcast to N user(s)"),
        ...pick(errorResponses, 400, 401, 403),
      },
    });
}