// services/notification.service.ts
import { Types } from 'mongoose';
import { INotificationRepository } from '../repositories/notification.repository';
import { INotification, NotificationType, AudienceType } from '../models/notification.model';
import { UserRole } from '../models/user.model';
import { NotificationNotFoundError } from '../errors/error';

// Placeholder shape — replace with your actual IUserRepository import
interface IUserRepository {
  findIdsByRole(role: UserRole): Promise<string[]>;
  findAllIds(): Promise<string[]>;
}

export interface NotifyUserPayload {
  recipientId: string;
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
}

export interface BroadcastPayload {
  title: string;
  message: string;
  type: NotificationType;
  targetRole?: UserRole; // omit → broadcast to every user
  actionUrl?: string;
}

export interface INotificationService {
  notifyUser(payload: NotifyUserPayload): Promise<INotification>;
  broadcast(payload: BroadcastPayload, createdBy: string): Promise<number>;
  getUserNotifications(userId: string, filters?: { isRead?: boolean; type?: NotificationType }, page?: number, limit?: number): Promise<INotification[]>;
  getUnreadCount(userId: string): Promise<number>;
  markAsRead(id: string, userId: string): Promise<INotification>;
  markAllAsRead(userId: string): Promise<number>;
  deleteNotification(id: string, userId: string): Promise<void>;
}

export class NotificationService implements INotificationService {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly userRepository: IUserRepository
  ) {}

  public async notifyUser(payload: NotifyUserPayload): Promise<INotification> {
    return await this.notificationRepository.create({
      recipient: new Types.ObjectId(payload.recipientId),
      title: payload.title,
      message: payload.message,
      type: payload.type,
      audienceType: AudienceType.INDIVIDUAL,
      actionUrl: payload.actionUrl,
    });
  }

  public async broadcast(payload: BroadcastPayload, createdBy: string): Promise<number> {
    const userIds = payload.targetRole
      ? await this.userRepository.findIdsByRole(payload.targetRole)
      : await this.userRepository.findAllIds();

    if (userIds.length === 0) return 0;

    const docs = userIds.map((userId) => ({
      recipient: new Types.ObjectId(userId),
      title: payload.title,
      message: payload.message,
      type: payload.type,
      audienceType: payload.targetRole ? AudienceType.ROLE_BROADCAST : AudienceType.ALL,
      targetRole: payload.targetRole,
      createdBy: new Types.ObjectId(createdBy),
      actionUrl: payload.actionUrl,
    }));

    const created = await this.notificationRepository.createMany(docs);
    return created.length;
  }

  public async getUserNotifications(
    userId: string,
    filters: { isRead?: boolean; type?: NotificationType } = {},
    page = 1,
    limit = 20
  ): Promise<INotification[]> {
    return await this.notificationRepository.findByUser(userId, filters, { page, limit });
  }

  public async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.countUnread(userId);
  }

  public async markAsRead(id: string, userId: string): Promise<INotification> {
    const updated = await this.notificationRepository.markAsRead(id, userId);
    if (!updated) {
      throw new NotificationNotFoundError(`Notification ${id} not found`);
    }
    return updated;
  }

  public async markAllAsRead(userId: string): Promise<number> {
    return await this.notificationRepository.markAllAsRead(userId);
  }

  public async deleteNotification(id: string, userId: string): Promise<void> {
    const deleted = await this.notificationRepository.delete(id, userId);
    if (!deleted) {
      throw new NotificationNotFoundError(`Notification ${id} not found`);
    }
  }
}