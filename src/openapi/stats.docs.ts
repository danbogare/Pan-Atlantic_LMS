import { z } from "zod";
import { registry, bearerAuth, successEnvelope, errorResponses, pick } from "./registry";

const StatsSchema = registry.register(
  "PlatformStats",
  z.object({
    students: z.object({ total: z.number(), active: z.number(), disabled: z.number() }),
    instructors: z.object({ total: z.number(), active: z.number(), disabled: z.number() }),
    courses: z.object({
      total: z.number(),
      published: z.number(),
      draft: z.number(),
      archived: z.number(),
    }),
    enrollment: z.object({
      total: z.number(),
      averagePerCourse: z.number(),
      byCourse: z.array(
        z.object({ courseId: z.string(), title: z.string(), enrolled: z.number() })
      ),
    }),
    progress: z.object({ averageCompletionRate: z.number() }),
  })
);

export function registerStatsDocs() {
  registry.registerPath({
    method: "get",
    path: "/admin/stats",
    tags: ["Stats"],
    summary: "Get platform-wide stats",
    security: [{ [bearerAuth.name]: [] }],
    responses: { 200: successEnvelope(StatsSchema, "Stats retrieved successfully"), ...pick(errorResponses, 401, 403) },
  });
}