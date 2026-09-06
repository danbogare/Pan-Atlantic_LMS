// controllers/notification.controller.ts
import { Request, Response } from 'express';
import { INotificationService } from '../services/notification.service';
import { CreateNotificationInput, BroadcastNotificationInput } from '../validators/notification.validator';
import { NotificationType } from '../models/notification.model';
import { successResponse } from '../utils/response'; // adjust to your actual path

interface NotificationQuery {
  isRead?: string;
  type?: NotificationType;
  page?: string;
  limit?: string;
}

export interface INotificationController {
  createNotification(req: Request<{}, {}, CreateNotificationInput>, res: Response): Promise<void>;
  broadcastNotification(req: Request<{}, {}, BroadcastNotificationInput>, res: Response): Promise<void>;
  getMyNotifications(req: Request<{}, {}, {}, NotificationQuery>, res: Response): Promise<void>;
  getUnreadCount(req: Request, res: Response): Promise<void>;
  markAsRead(req: Request<{ id: string }>, res: Response): Promise<void>;
  markAllAsRead(req: Request, res: Response): Promise<void>;
  deleteNotification(req: Request<{ id: string }>, res: Response): Promise<void>;
}
export class NotificationController {
  constructor(private readonly notificationService: INotificationService) {}

  public createNotification = async (
    req: Request<{}, {}, CreateNotificationInput>,
    res: Response
  ): Promise<void> => {
    const { recipientId, title, message, type, actionUrl } = req.body;

    const notification = await this.notificationService.notifyUser({
      recipientId,
      title,
      message,
      type,
      actionUrl,
    });

    successResponse(res, 'Notification sent successfully.', notification);
  };

  public broadcastNotification = async (
    req: Request<{}, {}, BroadcastNotificationInput>,
    res: Response
  ): Promise<void> => {
    const { title, message, type, targetRole, actionUrl } = req.body;
    const createdBy = req.user?.id as string;

    const count = await this.notificationService.broadcast(
      { title, message, type, targetRole, actionUrl },
      createdBy
    );

    successResponse(res, `Notification broadcast to ${count} user(s).`, { count });
  };

  public getMyNotifications = async (
    req: Request<{}, {}, {}, NotificationQuery>,
    res: Response
  ): Promise<void> => {
    const userId = req.user?.id as string;
    const { isRead, type, page, limit } = req.query;

    const notifications = await this.notificationService.getUserNotifications(
      userId,
      {
        isRead: isRead !== undefined ? isRead === 'true' : undefined,
        type,
      },
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );

    successResponse(res, 'Notifications retrieved successfully.', notifications);
  };

  public getUnreadCount = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id as string;
    const count = await this.notificationService.getUnreadCount(userId);

    successResponse(res, 'Unread count retrieved successfully.', { count });
  };

  public markAsRead = async (
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id as string;

    const notification = await this.notificationService.markAsRead(id, userId);

    successResponse(res, 'Notification marked as read.', notification);
  };

  public markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id as string;
    const count = await this.notificationService.markAllAsRead(userId);

    successResponse(res, `${count} notification(s) marked as read.`, { count });
  };

  public deleteNotification = async (
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id as string;

    await this.notificationService.deleteNotification(id, userId);

    successResponse(res, 'Notification deleted successfully.', null);
  };
}