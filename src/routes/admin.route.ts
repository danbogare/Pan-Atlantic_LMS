import { Router } from "express";
import { IUserController } from "../controllers/user.controller";
import { IAuthMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler.middleware";
import { validate } from "../middlewares/validation.middleware";
import { enrollStudentSchema } from "../validators/student.validator";

export class AdminRouter {
    private readonly router = Router()
    constructor(
        private readonly userController: IUserController,
        private readonly authMiddleware: IAuthMiddleware
    ) {
        this.initializeUserRoutes();
    }

    public getRouter(): Router {
        return this.router;
    }

    private initializeUserRoutes(): void {
        this.router.use(asyncHandler(this.authMiddleware.requireAuth));
        this.router.use(asyncHandler(this.authMiddleware.requireAdmin));
        this.router.post("/student/enroll", validate(enrollStudentSchema), asyncHandler(this.userController.enrollStudent));
        this.router.post("/instructor/invite", validate(enrollStudentSchema), asyncHandler(this.userController.inviteInstructor));
        this.router.get("/students", asyncHandler(this.userController.getAllStudents));
        this.router.get("/students/:studentId", asyncHandler(this.userController.getStudentById));
        this.router.get("/instructors", asyncHandler(this.userController.getAllInstructors));
        this.router.get("/instructors/:instructorId", asyncHandler(this.userController.getInstructorById));
    }
}