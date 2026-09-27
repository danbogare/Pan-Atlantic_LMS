import { Types } from "mongoose";
import { QuestionType } from "../models/quiz.model";

export interface CreateOptionPayload {
  key: string;
  text: string;
}

export interface CreateQuestionPayload {
  text: string;
  type: QuestionType;
  options?: CreateOptionPayload[]; // required if type === MULTIPLE_CHOICE
  correctOption?: string;          // required if type === MULTIPLE_CHOICE
  points: number;
}

export interface CreateQuizPayload {
  title: string;
  questions: CreateQuestionPayload[];
  timeLimit?: number;
  passingScore?: number;
}

export interface SubmitAnswerPayload {
  questionId: string;
  selectedOption?: string; // MULTIPLE_CHOICE
  textAnswer?: string;     // FREE_TEXT
}

export interface GradeFreeTextPayload {
  questionId: string;
  points: number;
}

export interface CreateQuizData {
  lesson: Types.ObjectId;
  course: Types.ObjectId;
  title: string;
  questions: CreateQuestionPayload[];
  timeLimit?: number;
  passingScore: number;
}