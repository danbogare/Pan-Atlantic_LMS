import { Router } from "express";
import { IDiscussionController } from "../controllers/discussion.controller";
import { IAuthMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler.middleware";
import { validate } from "../middlewares/validation.middleware";
import { createDiscussionSchema, createReplySchema } from "../validators/discussion.validator";

export class DiscussionRouter {
  private readonly router = Router();

  constructor(
    private readonly discussionController: IDiscussionController,
    private readonly authMiddleware: IAuthMiddleware
  ) {
    this.initializeRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private initializeRoutes(): void {
    this.router.use(asyncHandler(this.authMiddleware.requireAuth));

    this.router.get("/:courseId/discussions", asyncHandler(this.discussionController.getCourseDiscussions));

    this.router.get(
      "/:courseId/discussions/:discussionId",
      asyncHandler(this.discussionController.getDiscussionById)
    );

    this.router.post(
      "/:courseId/discussions",
      validate(createDiscussionSchema),
      asyncHandler(this.discussionController.createDiscussion)
    );

    this.router.post(
      "/:courseId/discussions/:discussionId/replies",
      validate(createReplySchema),
      asyncHandler(this.discussionController.addReply)
    );
  }
}