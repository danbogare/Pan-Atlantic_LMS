import { Router } from "express";
import { IAuthMiddleware } from "../middlewares/auth.middleware";
import { IStatsController } from "../controllers/stats.controller";
import { asyncHandler } from "../middlewares/async-handler.middleware";
import { IAssignmentSubmissionController } from "../controllers/assignment.controller";
import { IQuizController } from "../controllers/quiz.controller";
import { IBadgeController } from "../controllers/badge.controller";
import { validate } from "../middlewares/validation.middleware";
import { gradeSubmissionSchema } from "../validators/assignment.validator";
import { createQuizSchema, gradeFreeTextSchema } from "../validators/quiz.validator";
import { createBadgeSchema, updateBadgeSchema } from "../validators/badge.validator";

export class InstructorRouter {
    private readonly router = Router();

    constructor(
        private readonly authMiddleware: IAuthMiddleware,
        private readonly statsController: IStatsController,
        private readonly badgeController: IBadgeController,
        private readonly quizController: IQuizController,
        private readonly submissionController: IAssignmentSubmissionController
    ) {
        this.router.use(asyncHandler(this.authMiddleware.requireAuth));
        this.router.use(asyncHandler(this.authMiddleware.requireInstructor));
        this.initializeStatsRoutes();
        this.initializeBadgeRoutes();
        this.initializeAssignmentRoutes();
        this.initializeQuizRoutes();
    }

    public getRouter(): Router {
        return this.router;
    }

    private initializeStatsRoutes(): void {
        this.router.get("/stats", asyncHandler(this.statsController.getInstructorStats));
    }

    private initializeBadgeRoutes(): void {
        this.router.get("/badges", asyncHandler(this.badgeController.getAllBadges));
        this.router.post("/badges", validate(createBadgeSchema), asyncHandler(this.badgeController.createBadge));
        this.router.put("/badges/:id", validate(updateBadgeSchema), asyncHandler(this.badgeController.updateBadge));
        this.router.delete("/badges/:id", asyncHandler(this.badgeController.deactivateBadge));
    }

    private initializeAssignmentRoutes(): void {
        this.router.put(
            "/assignments/submissions/:submissionId/grade",
            validate(gradeSubmissionSchema),
            asyncHandler(this.submissionController.gradeSubmission)
        );
    }

    private initializeQuizRoutes(): void {
        this.router.post(
        "/quizzes/lessons/:lessonId",
        validate(createQuizSchema),
        asyncHandler(this.quizController.createQuiz)
        );
        this.router.put(
        "/quizzes/attempts/:attemptId/grade",
        validate(gradeFreeTextSchema),
        asyncHandler(this.quizController.gradeFreeTextAnswer)
        );
    }
}