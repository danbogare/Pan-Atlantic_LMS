import { Router } from "express";
import { ICourseController } from "../controllers/course.controller";
import { asyncHandler } from "../middlewares/async-handler.middleware";

// Unauthenticated endpoints for the public website (course catalog)
export class PublicRouter {
  private readonly router = Router();

  constructor(private readonly courseController: ICourseController) {
    this.initializeRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private initializeRoutes(): void {
    // Published courses only; supports ?courseType=&level=&search=&page=&limit=
    this.router.get("/courses", asyncHandler(this.courseController.getPublicCourses));

    // Published course outline; lesson content is only included for preview lessons
    this.router.get("/courses/:courseId", asyncHandler(this.courseController.getPublicCourseDetails));
  }
}
