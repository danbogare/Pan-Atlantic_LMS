// src/openapi/course.docs.ts
import { z } from "zod";
import { registry, bearerAuth, successEnvelope, errorResponses, pick } from "./registry";
import {
  createCourseSchema,
  updateCourseSchema,
  createModuleSchema,
  updateModuleSchema,
  createLessonSchema,
  updateLessonSchema,
  reorderModulesSchema,
  reorderLessonsSchema,
  courseListQuerySchema,
  publicCourseListQuerySchema,
  enrollInCourseSchema,
  extendAccessSchema,
} from "../validators/course.validator";
import { CourseLevel, CourseStatus, CourseType, Currency } from "../models/course.model";
import { courseQuizAttemptsQuerySchema, courseSubmissionsQuerySchema } from "../validators/activity.validator";

const PersonRefSchema = z.object({ _id: z.string(), firstName: z.string(), lastName: z.string(), email: z.string().optional() });
const LessonRefSchema = z.object({ _id: z.string(), title: z.string(), module: z.string(), order: z.number() });

const SubmissionSchema = registry.register(
  "AssignmentSubmission",
  z.object({
    _id: z.string(),
    student: PersonRefSchema,
    lesson: LessonRefSchema,
    course: z.string(),
    content: z.string().optional(),
    fileUrl: z.string().optional(),
    status: z.enum(["submitted", "graded", "resubmit_requested"]),
    grade: z.number().optional(),
    feedback: z.string().optional(),
    gradedBy: PersonRefSchema.optional(),
    gradedAt: z.string().datetime().optional(),
    submittedAt: z.string().datetime(),
  })
);

const QuizAttemptReviewSchema = registry.register(
  "QuizAttemptReview",
  z.object({
    _id: z.string(),
    student: PersonRefSchema,
    lesson: LessonRefSchema,
    course: z.string(),
    quiz: z
      .object({ _id: z.string(), title: z.string(), passingScore: z.number(), timeLimit: z.number().optional() })
      .nullable()
      .openapi({ description: "null when the quiz has since been deleted (answers are then returned raw)" }),
    status: z.enum(["in_progress", "submitted", "graded"]),
    score: z.number().optional(),
    passed: z.boolean().optional(),
    gradedBy: PersonRefSchema.optional(),
    gradedAt: z.string().datetime().optional(),
    startedAt: z.string().datetime(),
    submittedAt: z.string().datetime().optional(),
    answers: z
      .array(
        z.object({
          questionId: z.string(),
          text: z.string(),
          type: z.enum(["multiple_choice", "free_text"]),
          points: z.number(),
          options: z.array(z.object({ key: z.string(), text: z.string() })).optional(),
          correctOption: z.string().optional(),
          selectedOption: z.string().optional(),
          textAnswer: z.string().optional(),
          pointsAwarded: z.number().optional(),
          isCorrect: z.boolean().optional().openapi({ description: "Multiple choice only; absent when unanswered" }),
        })
      )
      .openapi({ description: "One row per quiz question, including unanswered ones" }),
  })
);

const CourseIdParam = z.object({ courseId: z.string().openapi({ example: "clv9x...abc" }) });
const ModuleIdParam = z.object({ moduleId: z.string().openapi({ example: "clv9y...def" }) });
const LessonIdParam = z.object({ lessonId: z.string().openapi({ example: "clv9z...ghi" }) });

const StudentIdParam = z.object({ studentId: z.string().openapi({ example: "665f1c2e8b3e4a0012ab34cd" }) });

// Mirrors ICourse in models/course.model.ts
const CourseSchema = registry.register(
  "Course",
  z.object({
    _id: z.string(),
    title: z.string(),
    description: z.string(),
    thumbnail: z.string().optional(),
    level: z.enum(CourseLevel),
    courseType: z.enum(CourseType),
    status: z.enum(CourseStatus),
    duration: z.number().int().openapi({ description: "Access period in days after enrollment; 0 = never expires" }),
    price: z.number().openapi({ description: "Price in naira, up to 2 decimal places; 0 = free", example: 25000 }),
    currency: z.enum(Currency),
    prerequisites: z.array(z.string()).optional(),
    learningObjectives: z.array(z.string()).optional(),
    createdBy: z.string(),
    publishedAt: z.string().datetime().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
);

const AccessSummarySchema = registry.register(
  "CourseAccess",
  z.object({
    enrolledAt: z.string().datetime(),
    accessStartsAt: z.string().datetime().nullable().openapi({ description: "Midnight (Africa/Lagos) the day after enrollment" }),
    accessExpiresAt: z.string().datetime().nullable().openapi({ description: "null = never expires" }),
    isExpired: z.boolean(),
    daysRemaining: z.number().int().nullable().openapi({ description: "null = never expires" }),
  })
);

const PublicCourseSchema = registry.register(
  "PublicCourse",
  CourseSchema.omit({ status: true, createdBy: true, createdAt: true, updatedAt: true })
);

const PublicLessonSchema = z.object({
  _id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  order: z.number(),
  duration: z.number(),
  contentType: z.enum(["video", "document", "quiz", "essay", "assignment"]),
  isPreview: z.boolean(),
  contentLink: z.string().optional().openapi({ description: "Only present on preview lessons" }),
  contentFile: z.string().optional().openapi({ description: "Only present on preview lessons" }),
});

const PublicCourseDetailsSchema = PublicCourseSchema.extend({
  instructors: z.array(z.object({ firstName: z.string(), lastName: z.string(), role: z.string() })),
  modules: z.array(
    z.object({
      _id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      order: z.number(),
      duration: z.number(),
      lessons: z.array(PublicLessonSchema),
    })
  ),
});

const ModuleSchema = registry.register(
  "Module",
  z.object({ id: z.string(), title: z.string(), order: z.number(), duration: z.number() })
);

const LessonSchema = registry.register(
  "Lesson",
  z.object({
    id: z.string(),
    title: z.string(),
    contentType: z.enum(["video", "document", "quiz", "essay", "assignment"]),
    order: z.number(),
    duration: z.number(),
    isPreview: z.boolean().optional(),
  })
);

export function registerCourseDocs() {
  // PUBLIC (no authentication)

  registry.registerPath({
    method: "get",
    path: "/public/courses",
    tags: ["Public"],
    summary: "Public course catalog (published courses only)",
    request: { query: publicCourseListQuerySchema },
    responses: {
      200: successEnvelope(
        z.object({
          items: z.array(PublicCourseSchema),
          page: z.number().int(),
          limit: z.number().int().openapi({ description: "Defaults to 12, max 100" }),
          total: z.number().int(),
          totalPages: z.number().int(),
        }),
        "Paginated published courses"
      ),
      ...pick(errorResponses, 400),
    },
  });

  registry.registerPath({
    method: "get",
    path: "/public/courses/{courseId}",
    tags: ["Public"],
    summary: "Public course details with module/lesson outline",
    description: "Lesson content links are only included for preview lessons. Unpublished courses return 404.",
    request: { params: CourseIdParam },
    responses: { 200: successEnvelope(PublicCourseDetailsSchema, "Course outline"), ...pick(errorResponses, 404) },
  });

  // AUTHENTICATED

  registry.registerPath({
    method: "get",
    path: "/courses",
    tags: ["Courses"],
    summary: "List courses visible to the caller",
    description:
      "Admin: every course. Instructor: courses they are assigned to. Student: courses they are enrolled in (archived excluded), " +
      "each with an `access` object showing expiry. Filter with `courseType`, `level`, `status`, `search`; paginate with `page` + `limit`.",
    security: [{ [bearerAuth.name]: [] }],
    request: { query: courseListQuerySchema },
    responses: {
      200: successEnvelope(
        z.array(CourseSchema.extend({ access: AccessSummarySchema.optional().openapi({ description: "Students only" }) })),
        "List of courses"
      ),
      ...pick(errorResponses, 400, 401, 403),
    },
  });

  registry.registerPath({
    method: "get",
    path: "/courses/{courseId}",
    tags: ["Courses"],
    summary: "Get course details by course id",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam },
    responses: { 200: successEnvelope(CourseSchema, "Full course details"), ...pick(errorResponses, 401, 403, 404) },
  });

  registry.registerPath({
    method: "get",
    path: "/courses/{courseId}/instructors",
    tags: ["Courses"],
    summary: "Get course instructors by course id",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam },
    responses: {
      200: successEnvelope(z.array(z.object({ id: z.string(), name: z.string() })), "Course instructors"),
      ...pick(errorResponses, 401, 403, 404),
    },
  });

  registry.registerPath({
    method: "get",
    path: "/courses/{courseId}/students",
    tags: ["Courses"],
    summary: "Get enrolled students by course id",
    description: "Admin, an instructor assigned to the course, or an external assessor. Each enrollment includes the student's stored `progress` %.",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam },
    responses: {
      200: successEnvelope(z.array(z.object({ id: z.string(), name: z.string() })), "Enrolled students"),
      ...pick(errorResponses, 401, 403, 404),
    },
  });

  registry.registerPath({
    method: "get",
    path: "/courses/{courseId}/students/{studentId}/progress",
    tags: ["Courses"],
    summary: "Get one student's progress in a course",
    description: "Admin, an instructor assigned to the course, or an external assessor. 404 when the student is not enrolled.",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam.merge(StudentIdParam) },
    responses: {
      200: successEnvelope(
        z.object({
          student: z.object({ _id: z.string(), firstName: z.string(), lastName: z.string(), email: z.string() }).nullable(),
          enrollment: z.object({
            _id: z.string(),
            status: z.string(),
            enrolledAt: z.string().datetime(),
            completedAt: z.string().datetime().optional(),
            access: AccessSummarySchema,
          }),
          progress: z.number().openapi({ description: "Percentage of the course's lessons completed (0-100)" }),
          completedLessonIds: z.array(z.string()),
        }),
        "Student course progress"
      ),
      ...pick(errorResponses, 401, 403, 404),
    },
  });

  registry.registerPath({
    method: "get",
    path: "/courses/{courseId}/students/{studentId}/activity",
    tags: ["Courses"],
    summary: "Get one student's assignment submissions and quiz attempts in a course",
    description:
      "Admin, an instructor assigned to the course, or an external assessor. Grouped by lesson, newest first; " +
      "quiz attempts include each question's correct answer. 404 when the student is not enrolled.",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam.merge(StudentIdParam) },
    responses: {
      200: successEnvelope(
        z.object({
          assignments: z.array(z.object({ lesson: LessonRefSchema, submissions: z.array(SubmissionSchema) })),
          quizzes: z.array(z.object({ lesson: LessonRefSchema, attempts: z.array(QuizAttemptReviewSchema) })),
        }),
        "Student activity"
      ),
      ...pick(errorResponses, 400, 401, 403, 404),
    },
  });

  registry.registerPath({
    method: "get",
    path: "/courses/{courseId}/submissions",
    tags: ["Courses"],
    summary: "List every assignment submission in a course",
    description: "Admin, an instructor assigned to the course, or an external assessor. Includes resubmission history, newest first.",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam, query: courseSubmissionsQuerySchema },
    responses: {
      200: successEnvelope(z.array(SubmissionSchema), "Assignment submissions"),
      ...pick(errorResponses, 400, 401, 403, 404),
    },
  });

  registry.registerPath({
    method: "get",
    path: "/courses/{courseId}/quiz-attempts",
    tags: ["Courses"],
    summary: "List every quiz attempt in a course, with correct answers",
    description: "Admin, an instructor assigned to the course, or an external assessor. Newest first.",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam, query: courseQuizAttemptsQuerySchema },
    responses: {
      200: successEnvelope(z.array(QuizAttemptReviewSchema), "Quiz attempts"),
      ...pick(errorResponses, 400, 401, 403, 404),
    },
  });

  registry.registerPath({
    method: "get",
    path: "/courses/{courseId}/stats",
    tags: ["Courses"],
    security: [{ [bearerAuth.name]: [] }],
    summary: "Get course stats by course id",
    request: { params: CourseIdParam },
    responses: {
      200: successEnvelope(z.object({ enrolledCount: z.number(), completionRate: z.number() }), "Course statistics"),
      ...pick(errorResponses, 401, 403, 404),
    },
  });

  registry.registerPath({
    method: "get",
    path: "/courses/{courseId}/modules",
    tags: ["Modules"],
    summary: "Get modules with lessons by course id",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam },
    responses: {
      200: successEnvelope(z.array(ModuleSchema.and(z.object({ lessons: z.array(LessonSchema) }))), "Modules with lessons"),
      ...pick(errorResponses, 401, 403, 404),
    },
  });

  registry.registerPath({
    method: "get",
    path: "/courses/modules/{moduleId}/lessons",
    tags: ["Lessons"],
    summary: "Get lessons by module id",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: ModuleIdParam },
    responses: { 200: successEnvelope(z.array(LessonSchema), "Lessons for module"), ...pick(errorResponses, 401, 403, 404) },
  });

  // ---- ADMIN & INSTRUCTOR ----

  registry.registerPath({
    method: "post",
    path: "/courses/{courseId}/modules",
    tags: ["Modules"],
    summary: "Create a new module for a course by Admin",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam, body: { content: { "application/json": { schema: createModuleSchema } } } },
    responses: { 201: successEnvelope(ModuleSchema, "Module created"), ...pick(errorResponses, 400, 401, 403, 404) },
  });

  registry.registerPath({
    method: "put",
    path: "/courses/modules/{moduleId}",
    tags: ["Modules"],
    summary: "Update a module by Admin",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: ModuleIdParam, body: { content: { "application/json": { schema: updateModuleSchema } } } },
    responses: { 200: successEnvelope(ModuleSchema, "Module updated"), ...pick(errorResponses, 400, 401, 403, 404) },
  });

  registry.registerPath({
    method: "put",
    path: "/courses/{courseId}/modules/reorder",
    tags: ["Modules"],
    summary: "Reorder modules in a course by Admin",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam, body: { content: { "application/json": { schema: reorderModulesSchema } } } },
    responses: { 200: successEnvelope(z.object({}), "Modules reordered"), ...pick(errorResponses, 400, 401, 403, 404) },
  });

  registry.registerPath({
    method: "post",
    path: "/courses/modules/{moduleId}/lessons",
    tags: ["Lessons"],
    summary: "Create a new lesson for a module by Admin",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: ModuleIdParam,
      body: {
        description: "Lesson metadata + optional file upload",
        content: {
          "multipart/form-data": {
            schema: createLessonSchema.and(z.object({ file: z.string().openapi({ type: "string", format: "binary" } as any).optional() })),
          },
        },
      },
    },
    responses: { 201: successEnvelope(LessonSchema, "Lesson created"), ...pick(errorResponses, 400, 401, 403, 404) },
  });

  registry.registerPath({
    method: "put",
    path: "/courses/lessons/{lessonId}",
    tags: ["Lessons"],
    summary: "Update a lesson by Admin",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: LessonIdParam, body: { content: { "application/json": { schema: updateLessonSchema } } } },
    responses: { 200: successEnvelope(LessonSchema, "Lesson updated"), ...pick(errorResponses, 400, 401, 403, 404) },
  });

  registry.registerPath({
    method: "delete",
    path: "/courses/lessons/{lessonId}",
    tags: ["Lessons"],
    summary: "Delete a lesson by Admin",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: LessonIdParam },
    responses: { 200: successEnvelope(z.object({}), "Lesson deleted"), ...pick(errorResponses, 401, 403, 404) },
  });

  registry.registerPath({
    method: "post",
    path: "/courses/lessons/{lessonId}/content",
    tags: ["Lessons"],
    summary: "Upload content for a lesson by Admin",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: LessonIdParam,
      body: {
        description: "Lesson content file",
        content: { "multipart/form-data": { schema: z.object({ file: z.string().openapi({ type: "string", format: "binary" } as any) }) } },
      },
    },
    responses: { 200: successEnvelope(z.object({ url: z.string() }), "Content uploaded"), ...pick(errorResponses, 400, 401, 403, 404) },
  });

  registry.registerPath({
    method: "put",
    path: "/courses/modules/{moduleId}/lessons/reorder",
    tags: ["Lessons"],
    summary: "Reorder lessons in a module by Admin",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: ModuleIdParam, body: { content: { "application/json": { schema: reorderLessonsSchema } } } },
    responses: { 200: successEnvelope(z.object({}), "Lessons reordered"), ...pick(errorResponses, 400, 401, 403, 404) },
  });

  registry.registerPath({
    method: "post",
    path: "/courses/{courseId}/enroll",
    tags: ["Courses"],
    summary: "Enroll a student in a course (admin)",
    description:
      "Academic courses only; professional courses return 400 with `code: COURSE_TYPE_NOT_ALLOWED` (students apply for those " +
      "through `POST /courses/{courseId}/apply`). " +
      "The student's access starts at midnight (Africa/Lagos) the day after enrollment and lasts the course's `duration` in days.",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam, body: { content: { "application/json": { schema: enrollInCourseSchema } } } },
    responses: {
      201: successEnvelope(
        z.object({
          _id: z.string(),
          student: z.string(),
          course: z.string(),
          enrolledAt: z.string().datetime(),
          accessStartsAt: z.string().datetime(),
          accessExpiresAt: z.string().datetime().nullable(),
        }),
        "Enrolled"
      ),
      ...pick(errorResponses, 400, 401, 403, 404, 409),
    },
  });

  registry.registerPath({
    method: "put",
    path: "/courses/{courseId}/students/{studentId}/access",
    tags: ["Courses"],
    summary: "Extend or renew a student's course access (admin)",
    description:
      "Active access is extended from its current expiry. Expired, unlimited or pre-existing access gets a fresh window " +
      "starting the next day (Africa/Lagos). `days: 0` removes the expiry.",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: CourseIdParam.merge(StudentIdParam),
      body: { content: { "application/json": { schema: extendAccessSchema } } },
    },
    responses: {
      200: successEnvelope(AccessSummarySchema, "Updated access"),
      ...pick(errorResponses, 400, 401, 403, 404),
    },
  });

  // ---- ADMIN ONLY ----

  registry.registerPath({
    method: "post",
    path: "/courses",
    tags: ["Courses"],
    summary: "Create a new course by Admin",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        description: "New course with optional thumbnail",
        content: {
          "multipart/form-data": {
            schema: createCourseSchema.and(z.object({ thumbnail: z.string().openapi({ type: "string", format: "binary" } as any).optional() })),
          },
        },
      },
    },
    responses: { 201: successEnvelope(CourseSchema, "Course created"), ...pick(errorResponses, 400, 401, 403) },
  });

  registry.registerPath({
    method: "put",
    path: "/courses/{courseId}",
    tags: ["Courses"],
    summary: "Update a course by Admin",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam, body: { content: { "application/json": { schema: updateCourseSchema } } } },
    responses: { 200: successEnvelope(CourseSchema, "Course updated"), ...pick(errorResponses, 400, 401, 403, 404) },
  });

  registry.registerPath({
    method: "delete",
    path: "/courses/{courseId}",
    tags: ["Courses"],
    summary: "Delete a course by Admin",
    description:
      "Permanently deletes the course with its modules, lessons, quizzes, discussions and instructor assignments. " +
      "Refused with 409 (`code: COURSE_HAS_STUDENTS`) while any student is enrolled, whatever the enrollment status.",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam },
    responses: { 200: successEnvelope(z.object({}), "Course deleted"), ...pick(errorResponses, 401, 403, 404, 409) },
  });

  registry.registerPath({
    method: "patch",
    path: "/courses/{courseId}/publish",
    tags: ["Courses"],
    summary: "Publish a course by Admin",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam },
    responses: { 200: successEnvelope(CourseSchema, "Course published"), ...pick(errorResponses, 401, 403, 404) },
  });

  registry.registerPath({
    method: "delete",
    path: "/courses/modules/{moduleId}",
    tags: ["Modules"],
    summary: "Delete a module by Admin",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: ModuleIdParam },
    responses: { 200: successEnvelope(z.object({}), "Module deleted"), ...pick(errorResponses, 401, 403, 404) },
  });
}