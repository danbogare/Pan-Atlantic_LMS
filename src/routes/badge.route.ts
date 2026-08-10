import { Router } from "express";
import { IBadgeController } from "../controllers/badge.controller";
import { IAuthMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler.middleware";

export class BadgeRouter {
  private readonly router = Router();

  constructor(
    private readonly badgeController: IBadgeController,
    private readonly authMiddleware: IAuthMiddleware
  ) {
    this.initializeRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private initializeRoutes(): void {
    this.router.use(asyncHandler(this.authMiddleware.requireAuth));

    this.router.get("/", asyncHandler(this.badgeController.getStudentBadges));

    this.router.use(asyncHandler(this.authMiddleware.requireAdmin));
  }
}