import { Router } from "express";
import { IUserController } from "../controllers/user.controller";
import { IBadgeController } from "../controllers/badge.controller";
import { IStatsController } from "../controllers/stats.controller";
import { IAssignmentSubmissionController } from "../controllers/assignment.controller";
import { IAuthMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler.middleware";
import { validate } from "../middlewares/validation.middleware";
import { enrollStudentSchema } from "../validators/student.validator";
import { createBadgeSchema, updateBadgeSchema } from "../validators/badge.validator";
import { gradeSubmissionSchema } from "../validators/assignment.validator";

export class AdminRouter {
  private readonly router = Router();

  constructor(
    private readonly userController: IUserController,
    private readonly badgeController: IBadgeController,
    private readonly statsController: IStatsController,
    private readonly submissionController: IAssignmentSubmissionController,
    private readonly authMiddleware: IAuthMiddleware
  ) {
    this.router.use(asyncHandler(this.authMiddleware.requireAuth));
    this.router.use(asyncHandler(this.authMiddleware.requireAdmin));

    this.initializeUserRoutes();
    this.initializeBadgeRoutes();
    this.initializeStatsRoutes();
    this.initializeAssignmentRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private initializeUserRoutes(): void {
    this.router.post("/student/enroll", validate(enrollStudentSchema), asyncHandler(this.userController.enrollStudent));
    this.router.post("/instructor/invite", validate(enrollStudentSchema), asyncHandler(this.userController.inviteInstructor));
    this.router.get("/students", asyncHandler(this.userController.getAllStudents));
    this.router.get("/students/:studentId", asyncHandler(this.userController.getStudentById));
    this.router.get("/instructors", asyncHandler(this.userController.getAllInstructors));
    this.router.get("/instructors/:instructorId", asyncHandler(this.userController.getInstructorById));
  }

  private initializeBadgeRoutes(): void {
    this.router.get("/badges", asyncHandler(this.badgeController.getAllBadges));
    this.router.post("/badges", validate(createBadgeSchema), asyncHandler(this.badgeController.createBadge));
    this.router.put("/badges/:id", validate(updateBadgeSchema), asyncHandler(this.badgeController.updateBadge));
    this.router.delete("/badges/:id", asyncHandler(this.badgeController.deactivateBadge));
  }

  private initializeStatsRoutes(): void {
    this.router.get("/stats", asyncHandler(this.statsController.getPlatformStats));
  }

  private initializeAssignmentRoutes(): void {
    this.router.put(
      "/assignments/submissions/:submissionId/grade",
      validate(gradeSubmissionSchema),
      asyncHandler(this.submissionController.gradeSubmission)
    );
  }
}