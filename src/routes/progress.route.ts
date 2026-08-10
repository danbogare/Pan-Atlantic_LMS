import { Router } from "express";
import { IProgressController } from "../controllers/progress.controller";
import { IAuthMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler.middleware";
import { validate } from "../middlewares/validation.middleware";
import { markLessonCompleteSchema } from "../validators/progress.validator";

export class ProgressRouter {
  private readonly router = Router();

  constructor(
    private readonly progressController: IProgressController,
    private readonly authMiddleware: IAuthMiddleware
  ) {
    this.initializeRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private initializeRoutes(): void {
    this.router.use(asyncHandler(this.authMiddleware.requireAuth));

    this.router.get("/", asyncHandler(this.progressController.getAllProgress));

    this.router.get("/:courseId", asyncHandler(this.progressController.getCourseProgress));

    this.router.post(
      "/:courseId/lessons/complete",
      validate(markLessonCompleteSchema),
      asyncHandler(this.progressController.markLessonComplete)
    );
  }
}