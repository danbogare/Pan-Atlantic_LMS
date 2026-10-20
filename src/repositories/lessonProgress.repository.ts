import { Model, Types } from 'mongoose';
import { ILessonProgress } from '../models/lessonProgress.model';
import { ICourseLesson } from '../models/courseModule.model';

export interface ILessonProgressRepository {
  markComplete(progressData: Partial<ILessonProgress>): Promise<ILessonProgress | null>;
  isLessonComplete(studentId: string, lessonId: string): Promise<boolean>;
  getCompletedLessonIds(studentId: string, courseId: string): Promise<string[]>;
  getCourseProgressPercent(studentId: string, courseId: string): Promise<number>;
  // Removes every student's progress on these lessons (used when lessons are deleted)
  deleteByLessons(lessonIds: string[]): Promise<void>;
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

  // Only lessons that still exist in the course; records for deleted lessons are ignored
  public async getCompletedLessonIds(studentId: string, courseId: string): Promise<string[]> {
    const lessonIds = await this.getCourseLessonIds(courseId);
    if (lessonIds.length === 0) return [];

    const records = await this.lessonProgressModel
      .find({ student: studentId, lesson: { $in: lessonIds } })
      .select('lesson')
      .lean();

    return records.map((r) => r.lesson.toString());
  }

  public async getCourseProgressPercent(studentId: string, courseId: string): Promise<number> {
    const lessonIds = await this.getCourseLessonIds(courseId);
    if (lessonIds.length === 0) return 0;

    const completedCount = await this.lessonProgressModel.countDocuments({
      student: studentId,
      lesson: { $in: lessonIds },
    });

    // Floor so 100 only means every lesson is done (rounding would turn 199/200 into 100)
    return Math.min(100, Math.floor((completedCount / lessonIds.length) * 100));
  }

  public async deleteByLessons(lessonIds: string[]): Promise<void> {
    if (lessonIds.length === 0) return;
    await this.lessonProgressModel.deleteMany({ lesson: { $in: lessonIds } }).exec();
  }

  private async getCourseLessonIds(courseId: string): Promise<Types.ObjectId[]> {
    return await this.lessonModel.find({ course: new Types.ObjectId(courseId) }).distinct('_id');
  }
}