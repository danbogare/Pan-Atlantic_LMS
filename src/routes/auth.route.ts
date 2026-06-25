import { Router } from "express";
import { IAuthController } from "../controllers/auth.controller";
import { IAuthMiddleware } from "../middlewares/auth.middleware";
import { changePasswordSchema, forgotPasswordSchema, loginSchema, resetPasswordSchema } from "../validators/auth.validator";
import { validate } from "../middlewares/validation.middleware";
import { asyncHandler } from "../middlewares/async-handler.middleware";

export class AuthRouter {
    private readonly router = Router();
    constructor(
        private readonly authController: IAuthController,
        private readonly authMiddleware: IAuthMiddleware
    ) {
        this.initializeAuthRoutes();
    }

    public getRouter(): Router {
        return this.router;
    }

    private initializeAuthRoutes(): void {
        this.router.post("/login", validate(loginSchema), asyncHandler(this.authController.login));
        this.router.post("/password/reset", validate(forgotPasswordSchema), asyncHandler(this.authController.forgotPassword));
        this.router.put("/password/reset", validate(resetPasswordSchema), asyncHandler(this.authController.resetPassword));

        this.router.use(asyncHandler(this.authMiddleware.requireAuth));
        this.router.post("/password/change", validate(changePasswordSchema), asyncHandler( this.authController.changePassword));
    }
}