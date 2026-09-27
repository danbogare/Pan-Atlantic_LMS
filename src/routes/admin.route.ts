import { Router } from "express";
import { IUserController } from "../controllers/user.controller";
import { IStatsController } from "../controllers/stats.controller";
import { INotificationController } from "../controllers/notification.controller";
import { IAuthMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler.middleware";
import { validate } from "../middlewares/validation.middleware";
import { enrollStudentSchema } from "../validators/student.validator";
import { inviteInstructorSchema } from "../validators/instructor.validator";
import { updateUserInfoSchema } from "../validators/user.validator";
import { broadcastNotificationSchema, createNotificationSchema } from "../validators/notification.validator";

export class AdminRouter {
  private readonly router = Router();

  constructor(
    private readonly userController: IUserController,
    private readonly statsController: IStatsController,
    private readonly notificationController: INotificationController,
    private readonly authMiddleware: IAuthMiddleware
  ) {
    this.router.use(asyncHandler(this.authMiddleware.requireAuth));
    this.router.use(asyncHandler(this.authMiddleware.requireAdmin));

    this.initializeUserRoutes();
    this.initializeStatsRoutes();
    this.initializeNotificationRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private initializeUserRoutes(): void {
    this.router.post("/student/enroll", validate(enrollStudentSchema), asyncHandler(this.userController.enrollStudent));
    this.router.post("/instructor/invite", validate(inviteInstructorSchema), asyncHandler(this.userController.inviteInstructor));
    this.router.put("/users/:id", validate(updateUserInfoSchema), asyncHandler(this.userController.updateUserInfo));
    this.router.get("/students", asyncHandler(this.userController.getAllStudents));
    this.router.get("/students/:studentId", asyncHandler(this.userController.getStudentById));
    this.router.get("/instructors", asyncHandler(this.userController.getAllInstructors));
    this.router.get("/instructors/:instructorId", asyncHandler(this.userController.getInstructorById));
  }

  private initializeStatsRoutes(): void {
    this.router.get("/stats", asyncHandler(this.statsController.getPlatformStats));
  }

  private initializeNotificationRoutes(): void {
    this.router.post('/', validate(createNotificationSchema), asyncHandler(this.notificationController.createNotification));
    this.router.post('/broadcast', validate(broadcastNotificationSchema),asyncHandler(this.notificationController.broadcastNotification));
  }
}