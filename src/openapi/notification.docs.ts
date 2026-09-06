// src/openapi/notification.docs.ts
import { z } from "zod";
import { registry, bearerAuth, successEnvelope, errorResponses, pick } from "./registry";

const EmptyDataSchema = z.object({}).openapi({ example: {} });
const IdParam = z.object({ id: z.string().openapi({ example: "clv9x...abc" }) });

const NotificationQuery = z.object({
  isRead: z.enum(["true", "false"]).optional().openapi({ example: "false" }),
  type: z
    .enum(["course_update", "assignment_due", "grade_posted", "announcement", "enrollment", "system"])
    .optional()
    .openapi({ example: "assignment_due" }),
  page: z.string().optional().openapi({ example: "1" }),
  limit: z.string().optional().openapi({ example: "20" }),
});

export function registerNotificationDocs() {
  registry.registerPath({
    method: "get",
    path: "/notifications/me",
    tags: ["Notifications"],
    security: [{ [bearerAuth.name]: [] }],
    request: { query: NotificationQuery },
    responses: {
      200: successEnvelope(z.array(z.object({})), "Notifications retrieved successfully"),
      ...pick(errorResponses, 401),
    },
  });

  registry.registerPath({
    method: "get",
    path: "/notifications/me/unread-count",
    tags: ["Notifications"],
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: successEnvelope(z.object({ count: z.number().openapi({ example: 4 }) }), "Unread count retrieved successfully"),
      ...pick(errorResponses, 401),
    },
  });

  registry.registerPath({
    method: "patch",
    path: "/notifications/me/read-all",
    tags: ["Notifications"],
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: successEnvelope(z.object({ count: z.number().openapi({ example: 4 }) }), "N notification(s) marked as read"),
      ...pick(errorResponses, 401),
    },
  });

  registry.registerPath({
    method: "patch",
    path: "/notifications/{id}/read",
    tags: ["Notifications"],
    security: [{ [bearerAuth.name]: [] }],
    request: { params: IdParam },
    responses: {
      200: successEnvelope(z.object({}), "Notification marked as read"),
      ...pick(errorResponses, 401, 404),
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/notifications/{id}",
    tags: ["Notifications"],
    security: [{ [bearerAuth.name]: [] }],
    request: { params: IdParam },
    responses: {
      200: successEnvelope(EmptyDataSchema, "Notification deleted successfully"),
      ...pick(errorResponses, 401, 404),
    },
  });
}