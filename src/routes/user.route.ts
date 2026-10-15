import { Router } from "express";
import { IUserController } from "../controllers/user.controller";
import { IAuthMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler.middleware";
import { validate } from "../middlewares/validation.middleware";
import { updateProfileSchema } from "../validators/user.validator";

// Self-service endpoints for the logged-in user (any role)
export class UserRouter {
    private readonly router = Router();

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
        // Readable while a temporary password is pending, so the app can show who is logged in
        this.router.get(
            "/me",
            asyncHandler(this.authMiddleware.requireAuthAllowPasswordChange),
            asyncHandler(this.userController.getMyProfile)
        );

        this.router.patch(
            "/me",
            asyncHandler(this.authMiddleware.requireAuth),
            validate(updateProfileSchema),
            asyncHandler(this.userController.updateMyProfile)
        );
    }
}
