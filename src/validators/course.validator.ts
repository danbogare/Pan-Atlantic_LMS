import { z } from "zod";
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
} from "./common.validator";
import { CourseLevel } from "../models/course.model";

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

  duration: requiredNonNegativeNumber("Duration"),

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

  duration: optionalNonNegativeNumber("Duration"),

  prerequisites: optionalStringArray(),
  learningObjectives: optionalStringArray(),
  instructorIds: optionalStringArray(),
});

export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

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