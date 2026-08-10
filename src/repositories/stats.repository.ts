import { Model } from 'mongoose';
import { IUser, UserRole } from '../models/user.model';
import { ICourse, CourseStatus, IEnrollment } from '../models/course.model';

export interface IStatsRepository {
  getUserStats(role: UserRole): Promise<{ total: number; active: number; disabled: number }>;
  getCourseStats(): Promise<{ total: number; published: number; draft: number; archived: number }>;
  getEnrollmentStats(): Promise<{ total: number; averagePerCourse: number }>;
  getTopEnrolledCourses(limit: number): Promise<{ courseId: string; title: string; enrolled: number }[]>;
  getAverageCompletionRate(): Promise<number>;
}

export class StatsRepository implements IStatsRepository {
  constructor(
    private readonly userModel: Model<IUser>,
    private readonly courseModel: Model<ICourse>,
    private readonly enrollmentModel: Model<IEnrollment>
  ) {}

  public async getUserStats(
    role: UserRole
  ): Promise<{ total: number; active: number; disabled: number }> {
    const result = await this.userModel.aggregate([
      { $match: { role } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
        },
      },
    ]);

    const data = result[0] || { total: 0, active: 0 };
    return {
      total: data.total,
      active: data.active,
      disabled: data.total - data.active,
    };
  }

  public async getCourseStats(): Promise<{
    total: number;
    published: number;
    draft: number;
    archived: number;
  }> {
    const result = await this.courseModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          published: {
            $sum: { $cond: [{ $eq: ['$status', CourseStatus.PUBLISHED] }, 1, 0] },
          },
          draft: {
            $sum: { $cond: [{ $eq: ['$status', CourseStatus.DRAFT] }, 1, 0] },
          },
          archived: {
            $sum: { $cond: [{ $eq: ['$status', CourseStatus.ARCHIVED] }, 1, 0] },
          },
        },
      },
    ]);

    return result[0]
      ? {
          total: result[0].total,
          published: result[0].published,
          draft: result[0].draft,
          archived: result[0].archived,
        }
      : { total: 0, published: 0, draft: 0, archived: 0 };
  }

  public async getEnrollmentStats(): Promise<{ total: number; averagePerCourse: number }> {
    const [totalResult, perCourseResult] = await Promise.all([
      this.enrollmentModel.countDocuments(),
      this.enrollmentModel.aggregate([
        { $group: { _id: '$course', count: { $sum: 1 } } },
        { $group: { _id: null, averagePerCourse: { $avg: '$count' } } },
      ]),
    ]);

    return {
      total: totalResult,
      averagePerCourse: Math.round(perCourseResult[0]?.averagePerCourse || 0),
    };
  }

  public async getTopEnrolledCourses(
    limit: number
  ): Promise<{ courseId: string; title: string; enrolled: number }[]> {
    const result = await this.enrollmentModel.aggregate([
      { $group: { _id: '$course', enrolled: { $sum: 1 } } },
      { $sort: { enrolled: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: this.courseModel.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'course',
        },
      },
      { $unwind: '$course' },
      {
        $project: {
          _id: 0,
          courseId: '$_id',
          title: '$course.title',
          enrolled: 1,
        },
      },
    ]);

    return result.map((r) => ({
      courseId: r.courseId.toString(),
      title: r.title,
      enrolled: r.enrolled,
    }));
  }

  public async getAverageCompletionRate(): Promise<number> {
    const result = await this.enrollmentModel.aggregate([
      { $group: { _id: null, averageProgress: { $avg: '$progress' } } },
    ]);

    return Math.round(result[0]?.averageProgress || 0);
  }
}