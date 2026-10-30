import { ICourseRepository } from "../repositories/course.repository";
import { IAssignmentSubmissionRepository } from "../repositories/assignment.repository";
import { IQuizRepository, IQuizAttemptRepository } from "../repositories/quiz.repository";
import { IQuiz, QuestionType } from "../models/quiz.model";
import { SubmissionStatus } from "../models/assignment.model";
import { AttemptStatus } from "../models/quizAttempt.model";
import { CourseNotFoundError, EnrollmentNotFoundError } from "../errors/error";

export interface SubmissionFilter {
  studentId?: string;
  status?: SubmissionStatus;
}

export interface AttemptFilter {
  studentId?: string;
  status?: AttemptStatus;
}

// Read-only views of what students actually did in a course (assignment submissions, quiz answers).
// Quiz attempts include each question with its correct answer, for instructors, admins and external assessors.
export interface ICourseActivityService {
  getStudentActivity(courseId: string, studentId: string): Promise<any>;
  getCourseSubmissions(courseId: string, filter: SubmissionFilter): Promise<any[]>;
  getCourseQuizAttempts(courseId: string, filter: AttemptFilter): Promise<any[]>;
}

export class CourseActivityService implements ICourseActivityService {
  constructor(
    private readonly courseRepository: ICourseRepository,
    private readonly submissionRepository: IAssignmentSubmissionRepository,
    private readonly quizRepository: IQuizRepository,
    private readonly attemptRepository: IQuizAttemptRepository
  ) {}

  public async getStudentActivity(courseId: string, studentId: string): Promise<any> {
    await this.ensureCourseExists(courseId);
    const enrollment = await this.courseRepository.findEnrollment(studentId, courseId);
    if (!enrollment) {
      throw new EnrollmentNotFoundError(`Student ${studentId} is not enrolled in course ${courseId}`);
    }

    const [submissions, attempts] = await Promise.all([
      this.submissionRepository.findByCourse(courseId, { studentId }),
      this.loadAttempts(courseId, { studentId }),
    ]);

    return {
      assignments: this.groupByLesson(submissions, "submissions"),
      quizzes: this.groupByLesson(attempts, "attempts"),
    };
  }

  public async getCourseSubmissions(courseId: string, filter: SubmissionFilter): Promise<any[]> {
    await this.ensureCourseExists(courseId);
    return await this.submissionRepository.findByCourse(courseId, filter);
  }

  public async getCourseQuizAttempts(courseId: string, filter: AttemptFilter): Promise<any[]> {
    await this.ensureCourseExists(courseId);
    return await this.loadAttempts(courseId, filter);
  }

  private async loadAttempts(courseId: string, filter: AttemptFilter): Promise<any[]> {
    const [attempts, quizzes] = await Promise.all([
      this.attemptRepository.findByCourse(courseId, filter),
      this.quizRepository.findByCourse(courseId),
    ]);

    const quizById = new Map(quizzes.map((quiz) => [quiz._id!.toString(), quiz]));
    return attempts.map((attempt) => this.withAnswerSheet(attempt, quizById.get(attempt.quiz.toString())));
  }

  // Replaces the raw answers with one row per quiz question: the question, the correct answer and what the student gave
  private withAnswerSheet(attempt: any, quiz: IQuiz | undefined): any {
    const { answers, ...rest } = attempt;
    // Quiz deleted since the attempt: fall back to the raw answers
    if (!quiz) return { ...rest, quiz: null, answers };

    const answerByQuestion = new Map<string, any>(
      (answers ?? []).map((answer: any) => [answer.question.toString(), answer])
    );

    return {
      ...rest,
      quiz: { _id: quiz._id, title: quiz.title, passingScore: quiz.passingScore, timeLimit: quiz.timeLimit },
      answers: quiz.questions.map((question) => {
        const answer = answerByQuestion.get(question._id.toString());
        const isMultipleChoice = question.type === QuestionType.MULTIPLE_CHOICE;
        return {
          questionId: question._id,
          text: question.text,
          type: question.type,
          points: question.points,
          options: question.options,
          correctOption: question.correctOption,
          selectedOption: answer?.selectedOption,
          textAnswer: answer?.textAnswer,
          pointsAwarded: answer?.pointsAwarded,
          // Free-text answers are graded by points instead
          isCorrect: isMultipleChoice && answer ? answer.selectedOption === question.correctOption : undefined,
        };
      }),
    };
  }

  // Items arrive newest first, so each lesson's list stays newest first
  private groupByLesson(items: any[], key: "submissions" | "attempts"): any[] {
    const groups = new Map<string, { lesson: any; items: any[] }>();
    for (const item of items) {
      const lessonId = String(item.lesson?._id ?? item.lesson);
      if (!groups.has(lessonId)) groups.set(lessonId, { lesson: item.lesson, items: [] });
      groups.get(lessonId)!.items.push(item);
    }
    return [...groups.values()].map(({ lesson, items: grouped }) => ({ lesson, [key]: grouped }));
  }

  private async ensureCourseExists(courseId: string): Promise<void> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) throw new CourseNotFoundError(`Course ${courseId} not found`);
  }
}
