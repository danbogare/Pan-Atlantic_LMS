import { Router } from "express";
import { IAssignmentSubmissionController } from "../controllers/assignment.controller";
import { IAuthMiddleware } from "../middlewares/auth.middleware";
import { ICourseAccessMiddleware } from "../middlewares/course-access.middleware";
import { asyncHandler } from "../middlewares/async-handler.middleware";
import { validate } from "../middlewares/validation.middleware";
import { submitAssignmentSchema } from "../validators/assignment.validator";

export class AssignmentRouter {
  private readonly router = Router();

  constructor(
    private readonly submissionController: IAssignmentSubmissionController,
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

    // STUDENT ROUTES

    // GET /student/assignments
    this.router.get("/", asyncHandler(this.submissionController.getStudentAssignments));

    // GET /student/assignments/lessons/:lessonId/history
    this.router.get(
      "/lessons/:lessonId/history",
      asyncHandler(this.submissionController.getSubmissionHistory)
    );

    // POST /student/assignments/lessons/:lessonId/submit
    this.router.post(
      "/lessons/:lessonId/submit",
      validate(submitAssignmentSchema),
      asyncHandler(this.courseAccess.requireLearnAccess(this.courseAccess.fromLessonParam("lessonId"))),
      asyncHandler(this.submissionController.submitAssignment)
    );
  }
}