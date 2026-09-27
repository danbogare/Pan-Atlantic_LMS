import { IQuizRepository, IQuizAttemptRepository } from '../repositories/quiz.repository';
import { ICourseContentRepository } from '../repositories/courseModule.repository';
import { IQuiz, QuestionType } from '../models/quiz.model';
import { IQuizAttempt, AttemptStatus, IAnswer } from '../models/quizAttempt.model';
import { ContentType } from '../models/courseModule.model';
import {
  LessonNotFoundError,
  QuizNotFoundError,
  InvalidQuizLessonError,
  AttemptNotFoundError,
  AttemptAlreadyInProgressError,
  AttemptAlreadySubmittedError,
} from '../errors/error';
import { Types } from 'mongoose';
import { CreateQuizPayload, SubmitAnswerPayload } from '../interfaces/quiz.interface';

export interface IQuizService {
  createQuiz(lessonId: string, data: CreateQuizPayload): Promise<IQuiz>;
  getQuizForStudent(lessonId: string): Promise<any>; // sanitized — no correctOption
  startAttempt(studentId: string, quizId: string): Promise<IQuizAttempt>;
  submitAttempt(attemptId: string, answers: SubmitAnswerPayload[]): Promise<IQuizAttempt>;
  gradeFreeTextAnswer(attemptId: string, questionId: string, points: number, gradedBy: string): Promise<IQuizAttempt>;
}

export class QuizService implements IQuizService {
  constructor(
    private readonly quizRepository: IQuizRepository,
    private readonly attemptRepository: IQuizAttemptRepository,
    private readonly contentRepository: ICourseContentRepository
  ) {}

  public async createQuiz(lessonId: string, data: CreateQuizPayload): Promise<IQuiz> {
    const lesson = await this.contentRepository.findLessonById(lessonId);
    if (!lesson) throw new LessonNotFoundError(`Lesson ${lessonId} not found`);
    if (lesson.contentType !== ContentType.QUIZ) {
      throw new InvalidQuizLessonError(`Lesson ${lessonId} is not a quiz`);
    }

    return await this.quizRepository.create({
      lesson: new Types.ObjectId(lessonId),
      course: lesson.course,
      title: data.title,
      questions: data.questions,
      timeLimit: data.timeLimit,
      passingScore: data.passingScore ?? 70,
    });
  }

  // Strip correctOption before sending to a student — never trust the client to hide it itself
  public async getQuizForStudent(lessonId: string): Promise<any> {
    const quiz = await this.quizRepository.findByLesson(lessonId);
    if (!quiz) throw new QuizNotFoundError(`Quiz for lesson ${lessonId} not found`);

    return {
      id: quiz._id,
      title: quiz.title,
      timeLimit: quiz.timeLimit,
      passingScore: quiz.passingScore,
      questions: quiz.questions.map((q) => ({
        id: q._id,
        text: q.text,
        type: q.type,
        options: q.options?.map((o) => ({ key: o.key, text: o.text })),
        points: q.points,
      })),
    };
  }

  public async startAttempt(studentId: string, quizId: string): Promise<IQuizAttempt> {
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) throw new QuizNotFoundError(`Quiz ${quizId} not found`);

    const existing = await this.attemptRepository.findInProgress(studentId, quizId);
    if (existing) throw new AttemptAlreadyInProgressError(`Attempt already in progress for quiz ${quizId}`);

    return await this.attemptRepository.create({
      student: new Types.ObjectId(studentId),
      quiz: quiz._id as Types.ObjectId,
      lesson: quiz.lesson,
      course: quiz.course,
      status: AttemptStatus.IN_PROGRESS,
    });
  }

  public async submitAttempt(attemptId: string, submittedAnswers: SubmitAnswerPayload[]): Promise<IQuizAttempt> {
    const attempt = await this.attemptRepository.findById(attemptId);
    if (!attempt) throw new AttemptNotFoundError(`Attempt ${attemptId} not found`);
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new AttemptAlreadySubmittedError(`Attempt ${attemptId} already submitted`);
    }

    const quiz = await this.quizRepository.findById(attempt.quiz.toString());
    if (!quiz) throw new QuizNotFoundError(`Quiz ${attempt.quiz} not found`);

    let earnedPoints = 0;
    let totalAutoGradable = 0;
    let hasFreeText = false;

    const gradedAnswers: IAnswer[] = quiz.questions.map((question) => {
      const submitted = submittedAnswers.find((a) => a.questionId === question._id.toString());

      if (question.type === QuestionType.MULTIPLE_CHOICE) {
        totalAutoGradable += question.points;
        const isCorrect = submitted?.selectedOption === question.correctOption;
        const pointsAwarded = isCorrect ? question.points : 0;
        earnedPoints += pointsAwarded;
        return {
          question: question._id,
          selectedOption: submitted?.selectedOption,
          pointsAwarded,
        };
      }

      // FREE_TEXT: no auto-grade, awaits instructor review
      hasFreeText = true;
      return {
        question: question._id,
        textAnswer: submitted?.textAnswer,
        pointsAwarded: undefined,
      };
    });

    const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);

    // If there's free text pending, status stays SUBMITTED (not GRADED) until an instructor scores it.
    // Score is provisional (MCQ-only) until then.
    const provisionalScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    return (await this.attemptRepository.update(attemptId, {
      answers: gradedAnswers,
      status: AttemptStatus.SUBMITTED,
      score: hasFreeText ? undefined : provisionalScore,
      passed: hasFreeText ? undefined : provisionalScore >= quiz.passingScore,
      submittedAt: new Date(),
    })) as IQuizAttempt;
  }

  // Instructor grades one free-text answer; once all are graded, finalize the attempt
  public async gradeFreeTextAnswer(
    attemptId: string,
    questionId: string,
    points: number,
    gradedBy: string
  ): Promise<IQuizAttempt> {
    const attempt = await this.attemptRepository.findById(attemptId);
    if (!attempt) throw new AttemptNotFoundError(`Attempt ${attemptId} not found`);

    const quiz = await this.quizRepository.findById(attempt.quiz.toString());
    if (!quiz) throw new QuizNotFoundError(`Quiz ${attempt.quiz} not found`);

    const updatedAnswers = attempt.answers.map((a) =>
      a.question.toString() === questionId ? { ...a, pointsAwarded: points } : a
    );

    const allGraded = updatedAnswers.every((a) => a.pointsAwarded !== undefined);
    const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    const earnedPoints = updatedAnswers.reduce((sum, a) => sum + (a.pointsAwarded ?? 0), 0);
    const finalScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    return (await this.attemptRepository.update(attemptId, {
      answers: updatedAnswers,
      ...(allGraded && {
        status: AttemptStatus.GRADED,
        score: finalScore,
        passed: finalScore >= quiz.passingScore,
        gradedBy: new Types.ObjectId(gradedBy),
        gradedAt: new Date(),
      }),
    })) as IQuizAttempt;
  }
}