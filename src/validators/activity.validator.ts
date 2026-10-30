import { z } from "zod";
import { Types } from "mongoose";
import { SubmissionStatus } from "../models/assignment.model";
import { AttemptStatus } from "../models/quizAttempt.model";

const studentIdFilter = z
  .string()
  .trim()
  .refine((id) => Types.ObjectId.isValid(id), { error: "studentId is invalid" })
  .optional()
  .openapi({ description: "Only this student's records" });

export const courseSubmissionsQuerySchema = z.object({
  studentId: studentIdFilter,
  status: z
    .enum(SubmissionStatus, { error: "status must be submitted, graded, or resubmit_requested" })
    .optional(),
});

export type CourseSubmissionsQuery = z.infer<typeof courseSubmissionsQuerySchema>;

export const courseQuizAttemptsQuerySchema = z.object({
  studentId: studentIdFilter,
  status: z
    .enum(AttemptStatus, { error: "status must be in_progress, submitted, or graded" })
    .optional(),
});

export type CourseQuizAttemptsQuery = z.infer<typeof courseQuizAttemptsQuerySchema>;
