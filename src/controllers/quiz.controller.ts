import { Request, Response } from "express";
import { IQuizService } from "../services/quiz.service";
import { createdSuccessResponse, successResponse } from "../utils/response";
import { CreateQuizInput, SubmitAttemptInput, GradeFreeTextInput } from "../validators/quiz.validator";

export interface IQuizController {
  createQuiz: (req: Request<{ lessonId: string }, {}, CreateQuizInput>, res: Response) => Promise<void>;
  getQuizForStudent: (req: Request<{ lessonId: string }>, res: Response) => Promise<void>;
  startAttempt: (req: Request<{ quizId: string }>, res: Response) => Promise<void>;
  submitAttempt: (req: Request<{ attemptId: string }, {}, SubmitAttemptInput>, res: Response) => Promise<void>;
  gradeFreeTextAnswer: (req: Request<{ attemptId: string }, {}, GradeFreeTextInput>, res: Response) => Promise<void>;
}

export class QuizController implements IQuizController {
  constructor(private readonly quizService: IQuizService) {}

  public createQuiz = async (
    req: Request<{ lessonId: string }, {}, CreateQuizInput>,
    res: Response
  ): Promise<void> => {
    const { lessonId } = req.params;
    const quiz = await this.quizService.createQuiz(lessonId, req.body);
    createdSuccessResponse(res, "quiz created successfully", quiz);
  };

  public getQuizForStudent = async (req: Request<{ lessonId: string }>, res: Response): Promise<void> => {
    const { lessonId } = req.params;
    const quiz = await this.quizService.getQuizForStudent(lessonId);
    successResponse(res, "quiz retrieved successfully", quiz);
  };

  public startAttempt = async (req: Request<{ quizId: string }>, res: Response): Promise<void> => {
    const studentId = req.user?.id as string;
    const { quizId } = req.params;
    const attempt = await this.quizService.startAttempt(studentId, quizId);
    createdSuccessResponse(res, "quiz attempt started", attempt);
  };

  public submitAttempt = async (
    req: Request<{ attemptId: string }, {}, SubmitAttemptInput>,
    res: Response
  ): Promise<void> => {
    const { attemptId } = req.params;
    const { answers } = req.body;
    const attempt = await this.quizService.submitAttempt(attemptId, answers);
    successResponse(res, "quiz submitted successfully", attempt);
  };

  public gradeFreeTextAnswer = async (
    req: Request<{ attemptId: string }, {}, GradeFreeTextInput>,
    res: Response
  ): Promise<void> => {
    const gradedBy = req.user?.id as string;
    const { attemptId } = req.params;
    const { questionId, points } = req.body;
    const attempt = await this.quizService.gradeFreeTextAnswer(attemptId, questionId, points, gradedBy);
    successResponse(res, "answer graded successfully", attempt);
  };
}