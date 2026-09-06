import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { IAuthMiddleware } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/async-handler.middleware';

export class NotificationRouter {
    private readonly router = Router();

    constructor(
      private readonly notificationController: NotificationController,
      private readonly authMiddleware: IAuthMiddleware
    ) {
      this.initializeRoutes();
    }

    public getRouter(): Router {
      return this.router;
    }

    private initializeRoutes(): void {
      this.router.use(asyncHandler(this.authMiddleware.requireAuth));

      this.router.get('/me', asyncHandler(this.notificationController.getMyNotifications));
      this.router.get('/me/unread-count', asyncHandler(this.notificationController.getUnreadCount));
      this.router.patch('/me/read-all', asyncHandler(this.notificationController.markAllAsRead));
      this.router.patch('/:id/read', asyncHandler(this.notificationController.markAsRead));
      this.router.delete('/:id', asyncHandler(this.notificationController.deleteNotification));
    }
}