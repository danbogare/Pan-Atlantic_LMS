import { z } from "zod";
import { registry, bearerAuth, successEnvelope, errorResponses, pick } from "./registry";
import { createBadgeSchema, updateBadgeSchema } from "../validators/badge.validator";

const BadgeSchema = registry.register(
  "UserBadge",
  z.object({
    id: z.string(),
    badge: z.object({
      key: z.string(),
      name: z.string(),
      description: z.string(),
      icon: z.string().optional(),
    }),
    earnedAt: z.string().datetime(),
  })
);

const BadgeDefinitionSchema = registry.register(
  "BadgeDefinition",
  z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    description: z.string(),
    icon: z.string().optional(),
    criteriaType: z.enum(["courses_completed", "learning_streak", "enrollment_count"]),
    criteriaValue: z.number(),
    isActive: z.boolean(),
  })
);

export function registerBadgeDocs() {
  registry.registerPath({
    method: "get",
    path: "/student/badges",
    tags: ["Badges"],
    summary: "List the current student's earned badges",
    security: [{ [bearerAuth.name]: [] }],
    responses: { 200: successEnvelope(z.array(BadgeSchema), "Student badges"), ...pick(errorResponses, 401) },
  });

  registry.registerPath({
    method: "get",
    path: "/admin/badges",
    tags: ["Admin", "Badges"],
    summary: "List all badge definitions",
    security: [{ [bearerAuth.name]: [] }],
    responses: { 200: successEnvelope(z.array(BadgeDefinitionSchema), "All badges"), ...pick(errorResponses, 401, 403) },
  });

  registry.registerPath({
    method: "post",
    path: "/admin/badges",
    tags: ["Admin", "Badges"],
    summary: "Create a badge",
    security: [{ [bearerAuth.name]: [] }],
    request: { body: { content: { "application/json": { schema: createBadgeSchema } } } },
    responses: { 201: successEnvelope(BadgeDefinitionSchema, "Badge created"), ...pick(errorResponses, 400, 401, 403) },
  });

  registry.registerPath({
    method: "put",
    path: "/admin/badges/{id}",
    tags: ["Admin", "Badges"],
    summary: "Update a badge",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: updateBadgeSchema } } },
    },
    responses: { 200: successEnvelope(BadgeDefinitionSchema, "Badge updated"), ...pick(errorResponses, 400, 401, 403, 404) },
  });

  registry.registerPath({
    method: "delete",
    path: "/admin/badges/{id}",
    tags: ["Admin", "Badges"],
    summary: "Deactivate a badge",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: successEnvelope(z.object({}), "Badge deactivated"), ...pick(errorResponses, 401, 403, 404) },
  });
}