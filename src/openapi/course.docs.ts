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
} from "../validators/course.validator";

const CourseIdParam = z.object({ courseId: z.string().openapi({ example: "clv9x...abc" }) });
const ModuleIdParam = z.object({ moduleId: z.string().openapi({ example: "clv9y...def" }) });
const LessonIdParam = z.object({ lessonId: z.string().openapi({ example: "clv9z...ghi" }) });

// GUESS — paste your Course/Module/Lesson mongoose/prisma models (or
// course.controller.ts) so these response shapes reflect what you actually
// return, not just what was accepted on the way in.
const CourseSchema = registry.register(
  "Course",
  z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    level: z.string(),
    duration: z.number(),
    prerequisites: z.array(z.string()).optional(),
    learningObjectives: z.array(z.string()).optional(),
    published: z.boolean(),
    createdAt: z.string().datetime(),
  })
);

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
  // PUBLIC (any authenticated user)

  registry.registerPath({
    method: "get",
    path: "/courses",
    tags: ["Courses"],
    summary: "List all courses",
    security: [{ [bearerAuth.name]: [] }],
    responses: { 200: successEnvelope(z.array(CourseSchema), "List of courses"), ...pick(errorResponses, 401) },
  });

  registry.registerPath({
    method: "get",
    path: "/courses/{courseId}",
    tags: ["Courses"],
    summary: "Get course details by course id",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam },
    responses: { 200: successEnvelope(CourseSchema, "Full course details"), ...pick(errorResponses, 401, 404) },
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
      ...pick(errorResponses, 401, 404),
    },
  });

  registry.registerPath({
    method: "get",
    path: "/courses/{courseId}/students",
    tags: ["Courses"],
    summary: "Get enrolled students by course id",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam },
    responses: {
      200: successEnvelope(z.array(z.object({ id: z.string(), name: z.string() })), "Enrolled students"),
      ...pick(errorResponses, 401, 404),
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
      ...pick(errorResponses, 401, 404),
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
      ...pick(errorResponses, 401, 404),
    },
  });

  registry.registerPath({
    method: "get",
    path: "/courses/modules/{moduleId}/lessons",
    tags: ["Lessons"],
    summary: "Get lessons by module id",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: ModuleIdParam },
    responses: { 200: successEnvelope(z.array(LessonSchema), "Lessons for module"), ...pick(errorResponses, 401, 404) },
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
    summary: "Enroll in a course by Admin",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam },
    responses: { 200: successEnvelope(z.object({ enrolled: z.boolean() }), "Enrolled"), ...pick(errorResponses, 401, 404, 409) },
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
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam },
    responses: { 200: successEnvelope(z.object({}), "Course archived"), ...pick(errorResponses, 401, 403, 404) },
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