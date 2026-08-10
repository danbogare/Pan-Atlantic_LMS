import { z } from "zod";
import { registry, bearerAuth, successEnvelope, errorResponses, pick } from "./registry";
import { submitAssignmentSchema, gradeSubmissionSchema } from "../validators/assignment.validator";

const LessonIdParam = z.object({ lessonId: z.string().openapi({ example: "clv9z...ghi" }) });
const SubmissionIdParam = z.object({ submissionId: z.string().openapi({ example: "clv9w...jkl" }) });

const SubmissionSchema = registry.register(
  "AssignmentSubmission",
  z.object({
    id: z.string(),
    student: z.string(),
    lesson: z.string(),
    course: z.string(),
    content: z.string().optional(),
    fileUrl: z.string().optional(),
    status: z.enum(["submitted", "graded", "resubmit_requested"]),
    grade: z.number().optional(),
    feedback: z.string().optional(),
    submittedAt: z.string().datetime(),
  })
);

const StudentAssignmentSchema = registry.register(
  "StudentAssignment",
  z.object({
    lesson: z.object({ id: z.string(), title: z.string(), course: z.string() }),
    submission: SubmissionSchema.nullable(),
  })
);

export function registerAssignmentDocs() {
  registry.registerPath({
    method: "get",
    path: "/student/assignments",
    tags: ["Assignments"],
    summary: "List assignments across the student's enrolled courses",
    security: [{ [bearerAuth.name]: [] }],
    responses: { 200: successEnvelope(z.array(StudentAssignmentSchema), "Student assignments"), ...pick(errorResponses, 401) },
  });

  registry.registerPath({
    method: "get",
    path: "/student/assignments/lessons/{lessonId}/history",
    tags: ["Assignments"],
    summary: "Get submission history for one assignment lesson",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: LessonIdParam },
    responses: { 200: successEnvelope(z.array(SubmissionSchema), "Submission history"), ...pick(errorResponses, 401, 404) },
  });

  registry.registerPath({
    method: "post",
    path: "/student/assignments/lessons/{lessonId}/submit",
    tags: ["Assignments"],
    summary: "Submit an assignment",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: LessonIdParam,
      body: { content: { "application/json": { schema: submitAssignmentSchema } } },
    },
    responses: { 201: successEnvelope(SubmissionSchema, "Assignment submitted"), ...pick(errorResponses, 400, 401, 404) },
  });

  registry.registerPath({
    method: "put",
    path: "/admin/assignments/submissions/{submissionId}/grade",
    tags: ["Assignments"],
    summary: "Grade a submission (instructor/admin)",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: SubmissionIdParam,
      body: { content: { "application/json": { schema: gradeSubmissionSchema } } },
    },
    responses: { 200: successEnvelope(SubmissionSchema, "Submission graded"), ...pick(errorResponses, 400, 401, 403, 404) },
  });
}