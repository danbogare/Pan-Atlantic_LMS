import { Model, Types } from 'mongoose';
import { ILessonProgress } from '../models/lessonProgress.model';
import { ICourseLesson } from '../models/courseModule.model';

export interface ILessonProgressRepository {
  markComplete(progressData: Partial<ILessonProgress>): Promise<ILessonProgress | null>;
  isLessonComplete(studentId: string, lessonId: string): Promise<boolean>;
  getCompletedLessonIds(studentId: string, courseId: string): Promise<string[]>;
  getCourseProgressPercent(studentId: string, courseId: string): Promise<number>;
}

export class LessonProgressRepository implements ILessonProgressRepository {
  constructor(
    private readonly lessonProgressModel: Model<ILessonProgress>,
    private readonly lessonModel: Model<ICourseLesson>
  ) {}

  // Relies on the {student, lesson} unique index — calling this twice for
  // the same lesson is a safe no-op, not a duplicate record.
  public async markComplete(progressData: Partial<ILessonProgress>): Promise<ILessonProgress | null> {
    try {
      return await this.lessonProgressModel.create(progressData);
    } catch (err: any) {
      if (err.code === 11000) {
        return await this.lessonProgressModel.findOne({
          student: progressData.student,
          lesson: progressData.lesson,
        });
      }
      throw err;
    }
  }

  public async isLessonComplete(studentId: string, lessonId: string): Promise<boolean> {
    const record = await this.lessonProgressModel.findOne({ student: studentId, lesson: lessonId });
    return !!record;
  }

  public async getCompletedLessonIds(studentId: string, courseId: string): Promise<string[]> {
    const records = await this.lessonProgressModel
      .find({ student: studentId, course: courseId })
      .select('lesson')
      .lean();

    return records.map((r) => r.lesson.toString());
  }

  public async getCourseProgressPercent(studentId: string, courseId: string): Promise<number> {
    const [completedCount, totalCount] = await Promise.all([
      this.lessonProgressModel.countDocuments({
        student: studentId,
        course: new Types.ObjectId(courseId),
      }),
      this.lessonModel.countDocuments({ course: new Types.ObjectId(courseId) }),
    ]);

    if (totalCount === 0) return 0;
    return Math.round((completedCount / totalCount) * 100);
  }
}