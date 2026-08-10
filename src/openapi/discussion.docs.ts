import { z } from "zod";
import { registry, bearerAuth, successEnvelope, errorResponses, pick } from "./registry";
import { createDiscussionSchema, createReplySchema } from "../validators/discussion.validator";

const CourseIdParam = z.object({ courseId: z.string().openapi({ example: "clv9x...abc" }) });
const DiscussionParams = CourseIdParam.extend({
  discussionId: z.string().openapi({ example: "clv9y...def" }),
});

const ReplySchema = registry.register(
  "DiscussionReply",
  z.object({
    id: z.string(),
    author: z.string(),
    body: z.string(),
    createdAt: z.string().datetime(),
  })
);

const DiscussionSchema = registry.register(
  "Discussion",
  z.object({
    id: z.string(),
    course: z.string(),
    author: z.string(),
    title: z.string(),
    body: z.string(),
    repliesCount: z.number(),
    createdAt: z.string().datetime(),
  })
);

const DiscussionWithRepliesSchema = registry.register(
  "DiscussionWithReplies",
  DiscussionSchema.extend({ replies: z.array(ReplySchema) })
);

export function registerDiscussionDocs() {
  registry.registerPath({
    method: "get",
    path: "/courses/{courseId}/discussions",
    tags: ["Discussions"],
    summary: "List discussions for a course",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam },
    responses: { 200: successEnvelope(z.array(DiscussionSchema), "Course discussions"), ...pick(errorResponses, 401, 404) },
  });

  registry.registerPath({
    method: "get",
    path: "/courses/{courseId}/discussions/{discussionId}",
    tags: ["Discussions"],
    summary: "Get a discussion with its replies",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: DiscussionParams },
    responses: { 200: successEnvelope(DiscussionWithRepliesSchema, "Discussion with replies"), ...pick(errorResponses, 401, 404) },
  });

  registry.registerPath({
    method: "post",
    path: "/courses/{courseId}/discussions",
    tags: ["Discussions"],
    summary: "Create a discussion",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: CourseIdParam,
      body: { content: { "application/json": { schema: createDiscussionSchema } } },
    },
    responses: { 201: successEnvelope(DiscussionSchema, "Discussion created"), ...pick(errorResponses, 400, 401, 404) },
  });

  registry.registerPath({
    method: "post",
    path: "/courses/{courseId}/discussions/{discussionId}/replies",
    tags: ["Discussions"],
    summary: "Reply to a discussion",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: DiscussionParams,
      body: { content: { "application/json": { schema: createReplySchema } } },
    },
    responses: { 201: successEnvelope(ReplySchema, "Reply added"), ...pick(errorResponses, 400, 401, 404) },
  });
}