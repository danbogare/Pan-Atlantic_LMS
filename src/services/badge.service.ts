import { IBadgeRepository } from "../repositories/badge.repository";
import { IUserRepository } from "../repositories/user.repository";
import { ICourseRepository } from "../repositories/course.repository";
import { IUserBadge, BadgeCriteriaType, IBadge } from "../models/badge.model";
import { CreateBadgePayload, UpdateBadgePayload } from "../interfaces/badge.interface";
import { BadgeNotFoundError } from "../errors/error";

export interface IBadgeService {
  getStudentBadges(studentId: string): Promise<IUserBadge[]>;
  checkAndAwardBadges(studentId: string): Promise<IUserBadge[]>;
  createBadge(data: CreateBadgePayload): Promise<IBadge>;
  getAllBadges(): Promise<IBadge[]>;
  updateBadge(id: string, data: UpdateBadgePayload): Promise<IBadge>;
  deactivateBadge(id: string): Promise<void>;
}

export class BadgeService implements IBadgeService {
  constructor(
    private readonly badgeRepository: IBadgeRepository,
    private readonly userRepository: IUserRepository,
    private readonly courseRepository: ICourseRepository
  ) {}

  public async getStudentBadges(studentId: string): Promise<IUserBadge[]> {
    return await this.badgeRepository.getStudentBadges(studentId);
  }

  // Call this after anything that could move a student past a badge threshold:
  // enrollment completion, streak update, new enrollment. Safe to call
  // repeatedly — award() is a no-op for already-earned badges.
  public async checkAndAwardBadges(studentId: string): Promise<IUserBadge[]> {
    const [badges, user, enrollments] = await Promise.all([
      this.badgeRepository.getActiveBadges(),
      this.userRepository.findById(studentId),
      this.courseRepository.getStudentEnrollments(studentId),
    ]);

    if (!user) return [];

    const completedCount = enrollments.filter((e: any) => e.status === 'completed').length;
    const enrollmentCount = enrollments.length;
    const streak = user.learningStreak || 0;

    const newlyAwarded: IUserBadge[] = [];

    for (const badge of badges) {
      const alreadyEarned = await this.badgeRepository.hasBadge(studentId, badge._id.toString());
      if (alreadyEarned) continue;

      const meetsCriteria = this.evaluateCriteria(badge.criteriaType, badge.criteriaValue, {
        completedCount,
        enrollmentCount,
        streak,
      });

      if (meetsCriteria) {
        const awarded = await this.badgeRepository.award(studentId, badge._id.toString());
        if (awarded) newlyAwarded.push(awarded);
      }
    }

    return newlyAwarded;
  }

  public async createBadge(data: CreateBadgePayload): Promise<IBadge> {
    return await this.badgeRepository.createBadge(data);
  }

  public async getAllBadges(): Promise<IBadge[]> {
    return await this.badgeRepository.getAllBadges();
  }

  public async updateBadge(id: string, data: UpdateBadgePayload): Promise<IBadge> {
    const updated = await this.badgeRepository.updateBadge(id, data);
    if (!updated) {
      throw new BadgeNotFoundError(`Badge ${id} not found`);
    }
    return updated;
  }

  public async deactivateBadge(id: string): Promise<void> {
    const deactivated = await this.badgeRepository.deactivateBadge(id);
    if (!deactivated) {
      throw new BadgeNotFoundError(`Badge ${id} not found`);
    }
  }

  private evaluateCriteria(
    type: BadgeCriteriaType,
    value: number,
    stats: { completedCount: number; enrollmentCount: number; streak: number }
  ): boolean {
    switch (type) {
      case BadgeCriteriaType.COURSES_COMPLETED:
        return stats.completedCount >= value;
      case BadgeCriteriaType.LEARNING_STREAK:
        return stats.streak >= value;
      case BadgeCriteriaType.ENROLLMENT_COUNT:
        return stats.enrollmentCount >= value;
      default:
        return false;
    }
  }
}