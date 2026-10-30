import { Model } from 'mongoose';
import { IQuiz } from '../models/quiz.model';
import { IQuizAttempt, AttemptStatus } from '../models/quizAttempt.model';
import { CreateQuizData } from '../interfaces/quiz.interface';

export interface IQuizRepository {
  create(data: CreateQuizData): Promise<IQuiz>;
  findById(id: string): Promise<IQuiz | null>;
  findByLesson(lessonId: string): Promise<IQuiz | null>;
  update(id: string, data: Partial<IQuiz>): Promise<IQuiz | null>;
  deleteByCourse(courseId: string): Promise<void>;
  findByCourse(courseId: string): Promise<IQuiz[]>;
}

export interface IQuizAttemptRepository {
  create(data: Partial<IQuizAttempt>): Promise<IQuizAttempt>;
  findById(id: string): Promise<IQuizAttempt | null>;
  findInProgress(studentId: string, quizId: string): Promise<IQuizAttempt | null>;
  getAttemptHistory(studentId: string, quizId: string): Promise<IQuizAttempt[]>;
  update(id: string, data: Partial<IQuizAttempt>): Promise<IQuizAttempt | null>;
  hasPassedAttempt(studentId: string, quizId: string): Promise<boolean>;
  // Every attempt in a course, newest first, with student and lesson populated
  findByCourse(courseId: string, filter?: { studentId?: string; status?: AttemptStatus }): Promise<any[]>;
}

export class QuizRepository implements IQuizRepository {
  constructor(private readonly quizModel: Model<IQuiz>) {}

  public async create(data: CreateQuizData): Promise<IQuiz> {
    return await this.quizModel.create(data);
  }

  public async findById(id: string): Promise<IQuiz | null> {
    return await this.quizModel.findById(id).exec();
  }

  public async findByLesson(lessonId: string): Promise<IQuiz | null> {
    return await this.quizModel.findOne({ lesson: lessonId }).exec();
  }

  public async update(id: string, data: Partial<IQuiz>): Promise<IQuiz | null> {
    return await this.quizModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  public async deleteByCourse(courseId: string): Promise<void> {
    await this.quizModel.deleteMany({ course: courseId }).exec();
  }

  public async findByCourse(courseId: string): Promise<IQuiz[]> {
    return await this.quizModel.find({ course: courseId }).lean<IQuiz[]>().exec();
  }
}

export class QuizAttemptRepository implements IQuizAttemptRepository {
  constructor(private readonly attemptModel: Model<IQuizAttempt>) {}

  public async create(data: Partial<IQuizAttempt>): Promise<IQuizAttempt> {
    return await this.attemptModel.create(data);
  }

  public async findById(id: string): Promise<IQuizAttempt | null> {
    return await this.attemptModel.findById(id).exec();
  }

  public async findInProgress(studentId: string, quizId: string): Promise<IQuizAttempt | null> {
    return await this.attemptModel
      .findOne({ student: studentId, quiz: quizId, status: AttemptStatus.IN_PROGRESS })
      .exec();
  }

  public async getAttemptHistory(studentId: string, quizId: string): Promise<IQuizAttempt[]> {
    return await this.attemptModel
      .find({ student: studentId, quiz: quizId })
      .sort({ startedAt: -1 })
      .exec();
  }

  public async update(id: string, data: Partial<IQuizAttempt>): Promise<IQuizAttempt | null> {
    return await this.attemptModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  public async hasPassedAttempt(studentId: string, quizId: string): Promise<boolean> {
    const attempt = await this.attemptModel.exists({ student: studentId, quiz: quizId, passed: true });
    return !!attempt;
  }

  public async findByCourse(
    courseId: string,
    filter: { studentId?: string; status?: AttemptStatus } = {}
  ): Promise<any[]> {
    return await this.attemptModel
      .find({
        course: courseId,
        ...(filter.studentId && { student: filter.studentId }),
        ...(filter.status && { status: filter.status }),
      })
      .populate('student', 'firstName lastName email')
      .populate('lesson', 'title module order')
      .populate('gradedBy', 'firstName lastName')
      .sort({ startedAt: -1 })
      .lean();
  }
}