import { z } from "zod";
import "../openapi/registry";
import { idField } from "./common.validator";

export const markLessonCompleteSchema = z.object({
  moduleId: idField("Module ID"),
  lessonId: idField("Lesson ID"),
});

export type MarkLessonCompleteInput = z.infer<typeof markLessonCompleteSchema>;