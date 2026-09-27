import { Router } from "express";
import { IQuizController } from "../controllers/quiz.controller";
import { IAuthMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler.middleware";
import { validate } from "../middlewares/validation.middleware";
import { submitAttemptSchema } from "../validators/quiz.validator";

export class QuizRouter {
  private readonly router = Router();

  constructor(
    private readonly quizController: IQuizController,
    private readonly authMiddleware: IAuthMiddleware
  ) {
    this.initializeRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private initializeRoutes(): void {
    this.router.use(asyncHandler(this.authMiddleware.requireAuth));

    // GET /student/quizzes/lessons/:lessonId
    this.router.get(
      "/lessons/:lessonId",
      asyncHandler(this.quizController.getQuizForStudent)
    );

    // POST /student/quizzes/:quizId/attempts
    this.router.post(
      "/:quizId/attempts",
      asyncHandler(this.quizController.startAttempt)
    );

    // PATCH /student/quizzes/attempts/:attemptId/submit
    this.router.patch(
      "/attempts/:attemptId/submit",
      validate(submitAttemptSchema),
      asyncHandler(this.quizController.submitAttempt)
    );
  }
}