import { z } from "zod";
import { Types } from "mongoose";
import {
  requiredTitle,
  optionalTitle,
  idField,
  requiredNonNegativeNumber,
  optionalNonNegativeNumber,
  nonNegativeNumberWithDefault,
  optionalBoolean,
  optionalStringArray,
  urlOrEmpty,
  optionalNonNegativeInteger,
  nonNegativeIntegerWithDefault,
  nonNegativeMoneyWithDefault,
  optionalNonNegativeMoney,
} from "./common.validator";
import { CourseLevel, CourseStatus, CourseType } from "../models/course.model";

const courseTypeField = z
  .enum(CourseType, { error: "Course type must be professional or academic" })
  .openapi({ example: "professional", description: "professional or academic" });

const durationDescription =
  "Access period in days, counted from the day after a student is enrolled. 0 = access never expires.";
const priceDescription = "Course price in naira (NGN), up to 2 decimal places, e.g. 25000 or 25000.50. 0 = free.";

// CREATE COURSE SCHEMA
export const createCourseSchema = z.object({
  title: requiredTitle("Course title"),

  description: z
    .string({ error: "Course description is required" })
    .trim()
    .min(1, { error: "Description cannot be empty" })
    .openapi({ example: "Learn React in 30 days" }),

  level: z
    .enum(CourseLevel, {
      error: "Level must be beginner, intermediate, or advanced",
    })
    .default(CourseLevel.BEGINNER)
    .openapi({ example: "either of beginner, intermediate, or advanced" }),

  courseType: courseTypeField,

  duration: nonNegativeIntegerWithDefault("Duration", 0).openapi({ description: durationDescription }),

  price: nonNegativeMoneyWithDefault("Price", 0).openapi({ description: priceDescription, example: 25000 }),

  prerequisites: optionalStringArray(),
  learningObjectives: optionalStringArray(),
  instructorIds: optionalStringArray(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;

// UPDATE COURSE SCHEMA
export const updateCourseSchema = z.object({
  title: optionalTitle("Course title"),

  description: z
    .string()
    .trim()
    .min(1, { error: "Description cannot be empty" })
    .optional()
    .openapi({ example: "Learn React in 30 days" }),

  level: z
    .enum(CourseLevel, {
      error: "Level must be beginner, intermediate, or advanced",
    })
    .optional()
    .openapi({ example: "either of beginner, intermediate, or advanced" }),

  courseType: courseTypeField.optional(),

  duration: optionalNonNegativeInteger("Duration").openapi({ description: durationDescription }),

  price: optionalNonNegativeMoney("Price").openapi({ description: priceDescription, example: 25000 }),

  prerequisites: optionalStringArray(),
  learningObjectives: optionalStringArray(),
  instructorIds: optionalStringArray(),
});

export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

// COURSE LIST QUERY (query strings always arrive as strings, hence coerce)
export const courseListQuerySchema = z.object({
  courseType: z.enum(CourseType, { error: "courseType must be professional or academic" }).optional(),
  level: z.enum(CourseLevel, { error: "level must be beginner, intermediate, or advanced" }).optional(),
  status: z.enum(CourseStatus, { error: "status must be draft, published, or archived" }).optional(),
  search: z.string().trim().max(100, { error: "search must be at most 100 characters" }).optional(),
  page: z.coerce.number({ error: "page must be a number" }).int().min(1, { error: "page must be at least 1" }).optional(),
  limit: z.coerce
    .number({ error: "limit must be a number" })
    .int()
    .min(1, { error: "limit must be at least 1" })
    .max(100, { error: "limit must be at most 100" })
    .optional(),
});

export type CourseListQuery = z.infer<typeof courseListQuerySchema>;

// Public catalog never exposes drafts/archived courses, so status is not accepted
export const publicCourseListQuerySchema = courseListQuerySchema.omit({ status: true });

export type PublicCourseListQuery = z.infer<typeof publicCourseListQuerySchema>;

// EXTEND / RENEW A STUDENT'S ACCESS
export const extendAccessSchema = z.object({
  days: z
    .number({ error: "days must be a number" })
    .int({ error: "days must be a whole number" })
    .min(0, { error: "days cannot be negative" })
    .openapi({
      example: 30,
      description:
        "Days to add. Active access is extended from its current expiry; expired access restarts from the next day (Africa/Lagos). 0 = remove the expiry (unlimited).",
    }),
});

export type ExtendAccessInput = z.infer<typeof extendAccessSchema>;

// CREATE MODULE SCHEMA
export const createModuleSchema = z.object({
  title: requiredTitle("Module title"),

  description: z.string().trim().optional().openapi({ example: "Module description" }),

  order: requiredNonNegativeNumber("Order"),

  duration: nonNegativeNumberWithDefault("Duration", 0),
});

export type CreateModuleInput = z.infer<typeof createModuleSchema>;

// UPDATE MODULE SCHEMA
export const updateModuleSchema = z.object({
  title: optionalTitle("Module title"),

  description: z.string().trim().optional().openapi({ example: "Module description" }),

  order: optionalNonNegativeNumber("Order"),

  duration: optionalNonNegativeNumber("Duration"),
});

export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;

// CREATE LESSON SCHEMA
export const createLessonSchema = z.object({
  title: requiredTitle("Lesson title"),

  description: z.string().trim().optional().openapi({ example: "Lesson description" }),

  order: requiredNonNegativeNumber("Order"),

  contentType: z.enum(['video', 'document', 'quiz', 'essay', 'assignment'], {
    error: "Invalid content type",
  }).openapi({ example: "either of video, document, quiz, essay, or assignment" }),

  contentLink: urlOrEmpty,

  duration: requiredNonNegativeNumber("Duration"),

  isPreview: optionalBoolean("isPreview"),
});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;

// UPDATE LESSON SCHEMA
export const updateLessonSchema = z.object({
  title: optionalTitle("Lesson title"),

  description: z.string().trim().optional().openapi({ example: "Lesson description" }),

  order: optionalNonNegativeNumber("Order"),

  contentType: z
    .enum(['video', 'document', 'quiz', 'essay', 'assignment'])
    .optional().openapi({ example: "either of video, document, quiz, essay, or assignment" }),

  contentLink: urlOrEmpty,

  duration: optionalNonNegativeNumber("Duration"),

  isPreview: optionalBoolean("isPreview"),
});

export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;

// REORDER SCHEMAS
export const reorderModulesSchema = z.object({
  moduleOrders: z.array(
    z.object({
      id: idField("Module ID"),
      order: requiredNonNegativeNumber("Order"),
    })
  ),
});

export const reorderLessonsSchema = z.object({
  lessonOrders: z.array(
    z.object({
      id: idField("Lesson ID"),
      order: requiredNonNegativeNumber("Order"),
    })
  ),
});

// ENROLL A STUDENT IN A COURSE
export const enrollInCourseSchema = z.object({
  studentId: idField("Student ID").refine((id) => Types.ObjectId.isValid(id), { error: "Student ID is invalid" }),
});

export type EnrollInCourseInput = z.infer<typeof enrollInCourseSchema>;
