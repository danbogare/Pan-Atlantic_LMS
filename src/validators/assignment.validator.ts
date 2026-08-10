import { z } from "zod";
import "../openapi/registry";
import { urlOrEmpty } from "./common.validator";

export const submitAssignmentSchema = z
  .object({
    content: z.string().trim().optional().openapi({ example: "My submission write-up..." }),
    fileUrl: urlOrEmpty,
  })
  .refine((data) => data.content || data.fileUrl, {
    error: "Either content or a file must be provided",
  });

export type SubmitAssignmentInput = z.infer<typeof submitAssignmentSchema>;

export const gradeSubmissionSchema = z.object({
  grade: z
    .number({ error: "Grade is required" })
    .min(0, { error: "Grade cannot be negative" })
    .max(100, { error: "Grade cannot exceed 100" })
    .openapi({ example: 85 }),
  feedback: z
    .string({ error: "Feedback is required" })
    .trim()
    .min(1, { error: "Feedback cannot be empty" })
    .openapi({ example: "Solid work, but review section 3." }),
});

export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;