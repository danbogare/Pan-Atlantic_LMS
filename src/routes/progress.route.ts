import { Router } from "express";
import { IProgressController } from "../controllers/progress.controller";
import { IAuthMiddleware } from "../middlewares/auth.middleware";
import { ICourseAccessMiddleware } from "../middlewares/course-access.middleware";
import { asyncHandler } from "../middlewares/async-handler.middleware";
import { validate } from "../middlewares/validation.middleware";
import { markLessonCompleteSchema } from "../validators/progress.validator";

export class ProgressRouter {
  private readonly router = Router();

  constructor(
    private readonly progressController: IProgressController,
    private readonly authMiddleware: IAuthMiddleware,
    private readonly courseAccess: ICourseAccessMiddleware
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
      asyncHandler(this.courseAccess.requireLearnAccess(this.courseAccess.fromParam("courseId"))),
      asyncHandler(this.progressController.markLessonComplete)
    );
  }
}