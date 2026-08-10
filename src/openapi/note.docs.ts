import { z } from "zod";
import { registry, bearerAuth, successEnvelope, errorResponses, pick } from "./registry";
import { createNoteSchema } from "../validators/note.validator";

const NoteIdParam = z.object({ id: z.string().openapi({ example: "clv9x...abc" }) });

const NoteSchema = registry.register(
  "Note",
  z.object({
    id: z.string(),
    student: z.string(),
    course: z.string(),
    lesson: z.string().optional(),
    content: z.string(),
    createdAt: z.string().datetime(),
  })
);

export function registerNoteDocs() {
  registry.registerPath({
    method: "get",
    path: "/student/notes",
    tags: ["Notes"],
    summary: "Get the current student's notes",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      query: z.object({
        courseId: z.string().optional(),
        lessonId: z.string().optional(),
      }),
    },
    responses: { 200: successEnvelope(z.array(NoteSchema), "Student notes"), ...pick(errorResponses, 401) },
  });

  registry.registerPath({
    method: "post",
    path: "/student/notes",
    tags: ["Notes"],
    summary: "Add a note",
    security: [{ [bearerAuth.name]: [] }],
    request: { body: { content: { "application/json": { schema: createNoteSchema } } } },
    responses: { 201: successEnvelope(NoteSchema, "Note created"), ...pick(errorResponses, 400, 401, 404) },
  });

  registry.registerPath({
    method: "delete",
    path: "/student/notes/{id}",
    tags: ["Notes"],
    summary: "Delete a note",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: NoteIdParam },
    responses: { 200: successEnvelope(z.object({}), "Note deleted"), ...pick(errorResponses, 401, 404) },
  });
}