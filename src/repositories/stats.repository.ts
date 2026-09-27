import { Model, Types } from 'mongoose';
import { IUser, UserRole } from '../models/user.model';
import { ICourse, CourseStatus, IEnrollment, IInstructorAssignment, AssignmentStatus, EnrollmentStatus } from '../models/course.model';
import { IDiscussion } from '../models/discussion.model';
import { InstructorCourseProgress, InstructorOverview, InstructorQuestionStats } from '../interfaces/stats.interface';

export interface IStatsRepository {
  getUserStats(role: UserRole): Promise<{ total: number; active: number; disabled: number }>;
  getCourseStats(): Promise<{ total: number; published: number; draft: number; archived: number }>;
  getEnrollmentStats(): Promise<{ total: number; averagePerCourse: number }>;
  getTopEnrolledCourses(limit: number): Promise<{ courseId: string; title: string; enrolled: number }[]>;
  getAverageCompletionRate(): Promise<number>;
  getInstructorCourseIds(instructorId: string): Promise<Types.ObjectId[]>;
  getInstructorOverview(courseIds: Types.ObjectId[]): Promise<InstructorOverview>;
  getQuestionStats(courseIds: Types.ObjectId[]): Promise<InstructorQuestionStats>;
  getCourseProgressOverview(courseIds: Types.ObjectId[]): Promise<InstructorCourseProgress[]>;
}

export class StatsRepository implements IStatsRepository {
  constructor(
    private readonly userModel: Model<IUser>,
    private readonly courseModel: Model<ICourse>,
    private readonly enrollmentModel: Model<IEnrollment>,
    private readonly assignmentModel: Model<IInstructorAssignment>,
    private readonly discussionModel: Model<IDiscussion>
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

  public async getInstructorCourseIds(instructorId: string): Promise<Types.ObjectId[]> {
    return await this.assignmentModel.distinct('course', {
      instructor: instructorId,
      status: AssignmentStatus.ACTIVE,
    });
  }

  public async getInstructorOverview(courseIds: Types.ObjectId[]): Promise<InstructorOverview> {
    if (courseIds.length === 0) {
      return { totalCourses: 0, totalStudents: 0, activeStudents: 0, averageProgress: 0 };
    }

    const [enrollmentAgg, distinctStudents, distinctActiveStudents] = await Promise.all([
      this.enrollmentModel.aggregate([
        { $match: { course: { $in: courseIds } } },
        { $group: { _id: null, averageProgress: { $avg: '$progress' } } },
      ]),
      this.enrollmentModel.distinct('student', { course: { $in: courseIds } }),
      this.enrollmentModel.distinct('student', {
        course: { $in: courseIds },
        status: EnrollmentStatus.ACTIVE,
      }),
    ]);

    return {
      totalCourses: courseIds.length,
      totalStudents: distinctStudents.length,
      activeStudents: distinctActiveStudents.length,
      averageProgress: Math.round(enrollmentAgg[0]?.averageProgress || 0),
    };
  }

  // NOTE: "answered" currently means "has at least one reply from anyone".
  // If you want instructor-only replies to count, filter DiscussionReply by
  // author role here (requires populating/joining against User.role).
  public async getQuestionStats(courseIds: Types.ObjectId[]): Promise<InstructorQuestionStats> {
    if (courseIds.length === 0) {
      return { pending: 0, answered: 0, responseRate: 0 };
    }

    const result = await this.discussionModel.aggregate([
      { $match: { course: { $in: courseIds } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          answered: { $sum: { $cond: [{ $gt: ['$repliesCount', 0] }, 1, 0] } },
        },
      },
    ]);

    const data = result[0] || { total: 0, answered: 0 };
    const pending = data.total - data.answered;
    const responseRate = data.total > 0 ? Math.round((data.answered / data.total) * 100) : 0;

    return { pending, answered: data.answered, responseRate };
  }

  public async getCourseProgressOverview(
    courseIds: Types.ObjectId[]
  ): Promise<InstructorCourseProgress[]> {
    if (courseIds.length === 0) return [];

    const result = await this.enrollmentModel.aggregate([
      { $match: { course: { $in: courseIds } } },
      {
        $group: {
          _id: '$course',
          enrolled: { $sum: 1 },
          averageCompletion: { $avg: '$progress' },
        },
      },
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
          averageCompletion: { $round: ['$averageCompletion', 0] },
        },
      },
      { $sort: { title: 1 } },
    ]);

    // Courses with zero enrollments never appear in the $group above (no Enrollment
    // docs to group), so left-join them back in at 0/0 rather than silently omitting.
    const coveredIds = new Set(result.map((r) => r.courseId.toString()));
    const missingCourseIds = courseIds.filter((id) => !coveredIds.has(id.toString()));

    let missingCourses: InstructorCourseProgress[] = [];
    if (missingCourseIds.length > 0) {
      const courses = await this.courseModel
        .find({ _id: { $in: missingCourseIds } })
        .select('title')
        .lean();
      missingCourses = courses.map((c) => ({
        courseId: (c._id as Types.ObjectId).toString(),
        title: c.title,
        enrolled: 0,
        averageCompletion: 0,
      }));
    }

    return [
      ...result.map((r) => ({
        courseId: r.courseId.toString(),
        title: r.title,
        enrolled: r.enrolled,
        averageCompletion: r.averageCompletion,
      })),
      ...missingCourses,
    ];
  }
}