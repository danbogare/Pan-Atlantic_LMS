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
    }
}