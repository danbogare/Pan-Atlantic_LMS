import { z } from "zod";
import { registry, bearerAuth, successEnvelope, errorResponses, pick } from "./registry";
import { markLessonCompleteSchema } from "../validators/progress.validator";

const CourseIdParam = z.object({ courseId: z.string().openapi({ example: "clv9x...abc" }) });

const EnrollmentProgressSchema = registry.register(
  "EnrollmentProgress",
  z.object({
    id: z.string(),
    course: z.object({ id: z.string(), title: z.string() }),
    progress: z.number(),
    status: z.enum(["active", "completed", "dropped"]),
  })
);

const CourseProgressSchema = registry.register(
  "CourseProgress",
  z.object({
    progress: z.number(),
    completedLessonIds: z.array(z.string()),
  })
);

const MarkCompleteResultSchema = registry.register(
  "MarkLessonCompleteResult",
  z.object({ progress: z.number(), completed: z.boolean() })
);

export function registerProgressDocs() {
  registry.registerPath({
    method: "get",
    path: "/student/progress",
    tags: ["Progress"],
    summary: "Get course-level progress across all enrollments",
    security: [{ [bearerAuth.name]: [] }],
    responses: { 200: successEnvelope(z.array(EnrollmentProgressSchema), "Enrollment progress"), ...pick(errorResponses, 401) },
  });

  registry.registerPath({
    method: "get",
    path: "/student/progress/{courseId}",
    tags: ["Progress"],
    summary: "Get per-lesson progress for one course",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam },
    responses: { 200: successEnvelope(CourseProgressSchema, "Course progress"), ...pick(errorResponses, 401, 404) },
  });

  registry.registerPath({
    method: "post",
    path: "/student/progress/{courseId}/lessons/complete",
    tags: ["Progress"],
    summary: "Mark a lesson complete",
    description:
      "The lesson must belong to the course (404 otherwise) and to `moduleId` (400 otherwise). " +
      "Quiz lessons need a passing quiz attempt first, and assignment lessons a submission that wasn't sent back for " +
      "resubmission; otherwise 400 with `code: LESSON_REQUIREMENT_NOT_MET`. Re-marking a completed lesson is a no-op.\n\n" +
      "Progress is the share of the course's current lessons completed, rounded down, so `completed` is only true once every " +
      "lesson is done; the enrollment is then completed and the certificate issued once. A newly completed lesson also updates " +
      "the student's `learningStreak` (consecutive Africa/Lagos calendar days with a completed lesson).",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: CourseIdParam,
      body: { content: { "application/json": { schema: markLessonCompleteSchema } } },
    },
    responses: { 200: successEnvelope(MarkCompleteResultSchema, "Lesson marked complete"), ...pick(errorResponses, 400, 401, 403, 404) },
  });
}