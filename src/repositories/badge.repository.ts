import { Model } from 'mongoose';
import { IBadge, IUserBadge } from '../models/badge.model';

export interface IBadgeRepository {
  getActiveBadges(): Promise<IBadge[]>;
  getStudentBadges(studentId: string): Promise<IUserBadge[]>;
  hasBadge(studentId: string, badgeId: string): Promise<boolean>;
  award(userId: string, badgeId: string): Promise<IUserBadge | null>;
  createBadge(badgeData: Partial<IBadge>): Promise<IBadge>;
  getAllBadges(): Promise<IBadge[]>;
  updateBadge(id: string, updateData: Partial<IBadge>): Promise<IBadge | null>;
  deactivateBadge(id: string): Promise<IBadge | null>;
}

export class BadgeRepository implements IBadgeRepository {
  constructor(
    private readonly badgeModel: Model<IBadge>,
    private readonly userBadgeModel: Model<IUserBadge>
  ) {}

  public async getActiveBadges(): Promise<IBadge[]> {
    return await this.badgeModel.find({ isActive: true }).exec();
  }

  public async getStudentBadges(studentId: string): Promise<IUserBadge[]> {
    return await this.userBadgeModel
      .find({ user: studentId })
      .populate('badge')
      .sort({ earnedAt: -1 })
      .exec();
  }

  public async hasBadge(studentId: string, badgeId: string): Promise<boolean> {
    const existing = await this.userBadgeModel.findOne({ user: studentId, badge: badgeId });
    return !!existing;
  }

  // Relies on the {user, badge} unique index — safe to call repeatedly from
  // an award-check routine without ever creating a duplicate.
  public async award(userId: string, badgeId: string): Promise<IUserBadge | null> {
    try {
      return await this.userBadgeModel.create({ user: userId, badge: badgeId });
    } catch (err: any) {
      if (err.code === 11000) return null; // already earned, not an error
      throw err;
    }
  }

  public async createBadge(badgeData: Partial<IBadge>): Promise<IBadge> {
    return await this.badgeModel.create(badgeData);
  }

  public async getAllBadges(): Promise<IBadge[]> {
    return await this.badgeModel.find().sort({ createdAt: -1 }).exec();
  }

  public async updateBadge(id: string, updateData: Partial<IBadge>): Promise<IBadge | null> {
    return await this.badgeModel.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).exec();
  }

  public async deactivateBadge(id: string): Promise<IBadge | null> {
    return await this.badgeModel.findByIdAndUpdate(id, { isActive: false }, { new: true }).exec();
  }
}