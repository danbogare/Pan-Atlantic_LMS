import { z } from "zod";
import "../openapi/registry";
import { idField } from "./common.validator";

export const createNoteSchema = z.object({
  courseId: idField("Course ID"),
  lessonId: idField("Lesson ID").optional(),
  content: z
    .string({ error: "Note content is required" })
    .trim()
    .min(1, { error: "Note cannot be empty" })
    .max(5000, { error: "Note must be less than 5000 characters" })
    .openapi({ example: "Remember to review closures before the quiz" }),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;