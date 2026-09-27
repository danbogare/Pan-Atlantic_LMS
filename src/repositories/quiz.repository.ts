import { Model } from 'mongoose';
import { IQuiz } from '../models/quiz.model';
import { IQuizAttempt, AttemptStatus } from '../models/quizAttempt.model';
import { CreateQuizData } from '../interfaces/quiz.interface';

export interface IQuizRepository {
  create(data: CreateQuizData): Promise<IQuiz>;
  findById(id: string): Promise<IQuiz | null>;
  findByLesson(lessonId: string): Promise<IQuiz | null>;
  update(id: string, data: Partial<IQuiz>): Promise<IQuiz | null>;
}

export interface IQuizAttemptRepository {
  create(data: Partial<IQuizAttempt>): Promise<IQuizAttempt>;
  findById(id: string): Promise<IQuizAttempt | null>;
  findInProgress(studentId: string, quizId: string): Promise<IQuizAttempt | null>;
  getAttemptHistory(studentId: string, quizId: string): Promise<IQuizAttempt[]>;
  update(id: string, data: Partial<IQuizAttempt>): Promise<IQuizAttempt | null>;
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
}