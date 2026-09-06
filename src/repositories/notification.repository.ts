// repositories/notification.repository.ts
import { Model } from 'mongoose';
import { INotification, NotificationType } from '../models/notification.model';

export interface NotificationFilters {
  isRead?: boolean;
  type?: NotificationType;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface INotificationRepository {
  create(data: Partial<INotification>): Promise<INotification>;
  createMany(data: Partial<INotification>[]): Promise<INotification[]>;
  findByUser(userId: string, filters?: NotificationFilters, pagination?: PaginationOptions): Promise<INotification[]>;
  countUnread(userId: string): Promise<number>;
  markAsRead(id: string, userId: string): Promise<INotification | null>;
  markAllAsRead(userId: string): Promise<number>;
  delete(id: string, userId: string): Promise<boolean>;
}

export class NotificationRepository implements INotificationRepository {
  constructor(private readonly model: Model<INotification>) {}

  public async create(data: Partial<INotification>): Promise<INotification> {
    return await this.model.create(data);
  }

  public async createMany(data: Partial<INotification>[]): Promise<INotification[]> {
    return (await this.model.insertMany(data)) as INotification[];
  }

  public async findByUser(
    userId: string,
    filters: NotificationFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<INotification[]> {
    const { page = 1, limit = 20 } = pagination;
    const query: Record<string, unknown> = { recipient: userId };

    if (filters.isRead !== undefined) query.isRead = filters.isRead;
    if (filters.type) query.type = filters.type;

    return await this.model
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  public async countUnread(userId: string): Promise<number> {
    return await this.model.countDocuments({ recipient: userId, isRead: false }).exec();
  }

  public async markAsRead(id: string, userId: string): Promise<INotification | null> {
    return await this.model
      .findOneAndUpdate(
        { _id: id, recipient: userId }, // scoped to owner — a user can't mark someone else's notification read
        { isRead: true, readAt: new Date() },
        { new: true }
      )
      .exec();
  }

  public async markAllAsRead(userId: string): Promise<number> {
    const result = await this.model
      .updateMany({ recipient: userId, isRead: false }, { isRead: true, readAt: new Date() })
      .exec();
    return result.modifiedCount;
  }

  public async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id, recipient: userId }).exec();
    return result.deletedCount === 1;
  }
}