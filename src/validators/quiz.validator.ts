import { z } from "zod";
import "../openapi/registry";
import { QuestionType } from "../models/quiz.model";

const optionSchema = z.object({
  key: z.string().trim().min(1, { error: "Option key is required" }).openapi({ example: "A" }),
  text: z.string().trim().min(1, { error: "Option text is required" }).openapi({ example: "Paris" }),
});

const questionSchema = z
  .object({
    text: z.string().trim().min(1, { error: "Question text is required" }).openapi({ example: "What is the capital of France?" }),
    type: z.nativeEnum(QuestionType).openapi({ example: QuestionType.MULTIPLE_CHOICE }),
    options: z.array(optionSchema).min(2).optional(),
    correctOption: z.string().trim().optional().openapi({ example: "A" }),
    points: z.number({ error: "Points is required" }).min(1, { error: "Points must be at least 1" }).openapi({ example: 5 }),
  })
  .refine(
    (data) => data.type !== QuestionType.MULTIPLE_CHOICE || (data.options && data.options.length >= 2),
    { error: "Multiple choice questions require at least 2 options", path: ["options"] }
  )
  .refine(
    (data) =>
      data.type !== QuestionType.MULTIPLE_CHOICE ||
      (!!data.correctOption && data.options?.some((o) => o.key === data.correctOption)),
    { error: "correctOption must match one of the provided option keys", path: ["correctOption"] }
  );

export const createQuizSchema = z.object({
  title: z.string().trim().min(1, { error: "Title is required" }).openapi({ example: "Chapter 3 Quiz" }),
  questions: z.array(questionSchema).min(1, { error: "At least one question is required" }),
  timeLimit: z.number().min(1).optional().openapi({ example: 20 }),
  passingScore: z.number().min(0).max(100).optional().openapi({ example: 70 }),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;

const answerSchema = z
  .object({
    questionId: z.string({ error: "questionId is required" }).openapi({ example: "clv9z...abc" }),
    selectedOption: z.string().trim().optional().openapi({ example: "B" }),
    textAnswer: z.string().trim().optional().openapi({ example: "Photosynthesis converts light to energy." }),
  })
  .refine((data) => data.selectedOption || data.textAnswer, {
    error: "Either selectedOption or textAnswer must be provided",
  });

export const submitAttemptSchema = z.object({
  answers: z.array(answerSchema).min(1, { error: "At least one answer is required" }),
});

export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;

export const gradeFreeTextSchema = z.object({
  questionId: z.string({ error: "questionId is required" }).openapi({ example: "clv9z...abc" }),
  points: z
    .number({ error: "Points is required" })
    .min(0, { error: "Points cannot be negative" })
    .openapi({ example: 3 }),
});

export type GradeFreeTextInput = z.infer<typeof gradeFreeTextSchema>;