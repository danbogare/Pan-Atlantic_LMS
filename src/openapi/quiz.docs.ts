import { z } from "zod";
import { registry, bearerAuth, successEnvelope, errorResponses, pick } from "./registry";
import { createQuizSchema, submitAttemptSchema, gradeFreeTextSchema } from "../validators/quiz.validator";

const LessonIdParam = z.object({ lessonId: z.string().openapi({ example: "clv9z...ghi" }) });
const QuizIdParam = z.object({ quizId: z.string().openapi({ example: "clv9z...jkl" }) });
const AttemptIdParam = z.object({ attemptId: z.string().openapi({ example: "clv9z...mno" }) });

const OptionSchema = registry.register(
  "QuizOption",
  z.object({ key: z.string(), text: z.string() })
);

const StudentQuestionSchema = registry.register(
  "StudentQuizQuestion",
  z.object({
    id: z.string(),
    text: z.string(),
    type: z.enum(["multiple_choice", "free_text"]),
    options: z.array(OptionSchema).optional(),
    points: z.number(),
  })
);

const StudentQuizSchema = registry.register(
  "StudentQuiz",
  z.object({
    id: z.string(),
    title: z.string(),
    timeLimit: z.number().optional(),
    passingScore: z.number(),
    questions: z.array(StudentQuestionSchema),
  })
);

const AnswerSchema = registry.register(
  "QuizAnswer",
  z.object({
    question: z.string(),
    selectedOption: z.string().optional(),
    textAnswer: z.string().optional(),
    pointsAwarded: z.number().optional(),
  })
);

const AttemptSchema = registry.register(
  "QuizAttempt",
  z.object({
    id: z.string(),
    student: z.string(),
    quiz: z.string(),
    lesson: z.string(),
    course: z.string(),
    answers: z.array(AnswerSchema),
    status: z.enum(["in_progress", "submitted", "graded"]),
    score: z.number().optional(),
    passed: z.boolean().optional(),
    startedAt: z.string().datetime(),
    submittedAt: z.string().datetime().optional(),
  })
);

const QuizSchema = registry.register(
  "Quiz",
  z.object({
    id: z.string(),
    lesson: z.string(),
    course: z.string(),
    title: z.string(),
    timeLimit: z.number().optional(),
    passingScore: z.number(),
  })
);

export function registerQuizDocs() {
  registry.registerPath({
    method: "post",
    path: "/instructor/quizzes/lessons/{lessonId}",
    tags: ["Quizzes"],
    summary: "Create a quiz for a lesson (instructor/admin)",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: LessonIdParam,
      body: { content: { "application/json": { schema: createQuizSchema } } },
    },
    responses: { 201: successEnvelope(QuizSchema, "Quiz created"), ...pick(errorResponses, 400, 401, 403, 404) },
  });

  registry.registerPath({
    method: "get",
    path: "/student/quizzes/lessons/{lessonId}",
    tags: ["Quizzes"],
    summary: "Get a quiz for a student (answers hidden)",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: LessonIdParam },
    responses: { 200: successEnvelope(StudentQuizSchema, "Quiz retrieved"), ...pick(errorResponses, 401, 404) },
  });

  registry.registerPath({
    method: "post",
    path: "/student/quizzes/{quizId}/attempts",
    tags: ["Quizzes"],
    summary: "Start a quiz attempt",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: QuizIdParam },
    responses: { 201: successEnvelope(AttemptSchema, "Attempt started"), ...pick(errorResponses, 400, 401, 404) },
  });

  registry.registerPath({
    method: "patch",
    path: "/student/quizzes/attempts/{attemptId}/submit",
    tags: ["Quizzes"],
    summary: "Submit answers for a quiz attempt",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: AttemptIdParam,
      body: { content: { "application/json": { schema: submitAttemptSchema } } },
    },
    responses: { 200: successEnvelope(AttemptSchema, "Quiz submitted"), ...pick(errorResponses, 400, 401, 404) },
  });

  registry.registerPath({
    method: "put",
    path: "/instructor/quizzes/attempts/{attemptId}/grade",
    tags: ["Quizzes"],
    summary: "Grade a free-text answer on an attempt (instructor/admin)",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: AttemptIdParam,
      body: { content: { "application/json": { schema: gradeFreeTextSchema } } },
    },
    responses: { 200: successEnvelope(AttemptSchema, "Answer graded"), ...pick(errorResponses, 400, 401, 403, 404) },
  });
}