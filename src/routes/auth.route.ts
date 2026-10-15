import { Router } from "express";
import { IAuthController } from "../controllers/auth.controller";
import { IAuthMiddleware } from "../middlewares/auth.middleware";
import {
    changePasswordSchema,
    forgotPasswordSchema,
    loginSchema,
    registerSchema,
    resendVerificationSchema,
    resetPasswordSchema,
    verifyEmailSchema,
} from "../validators/auth.validator";
import { validate } from "../middlewares/validation.middleware";
import { asyncHandler } from "../middlewares/async-handler.middleware";
import {
    loginRateLimiters,
    passwordResetConfirmRateLimiters,
    passwordResetRequestRateLimiters,
    registerRateLimiters,
    resendVerificationRateLimiters,
    verifyEmailRateLimiters,
} from "../middlewares/rate-limit.middleware";

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
        // Public student self-registration, completed by verifying the emailed code
        this.router.post("/register", registerRateLimiters, validate(registerSchema), asyncHandler(this.authController.register));
        this.router.post("/verify-email", verifyEmailRateLimiters, validate(verifyEmailSchema), asyncHandler(this.authController.verifyEmail));
        this.router.post(
            "/verify-email/resend",
            resendVerificationRateLimiters,
            validate(resendVerificationSchema),
            asyncHandler(this.authController.resendVerification)
        );
        this.router.post("/login", loginRateLimiters, validate(loginSchema), asyncHandler(this.authController.login));
        this.router.post("/password/reset", passwordResetRequestRateLimiters, validate(forgotPasswordSchema), asyncHandler(this.authController.forgotPassword));
        this.router.put("/password/reset", passwordResetConfirmRateLimiters, validate(resetPasswordSchema), asyncHandler(this.authController.resetPassword));

        // Users still on a temporary password must be able to reach this route to replace it
        this.router.post(
            "/password/change",
            asyncHandler(this.authMiddleware.requireAuthAllowPasswordChange),
            validate(changePasswordSchema),
            asyncHandler(this.authController.changePassword)
        );
    }
}