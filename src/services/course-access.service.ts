import { Types } from "mongoose";
import { ICourseRepository } from "../repositories/course.repository";
import { ICourseContentRepository } from "../repositories/courseModule.repository";
import { IQuizRepository, IQuizAttemptRepository } from "../repositories/quiz.repository";
import { IAssignmentSubmissionRepository } from "../repositories/assignment.repository";
import { IDiscussionRepository } from "../repositories/discussion.repository";
import { IAuthUserPayload } from "../interfaces/auth.interface";
import { UserRole } from "../models/user.model";
import { EnrollmentStatus } from "../models/course.model";
import { isAccessExpired } from "../utils/course-access";
import {
  AttemptNotFoundError,
  CourseAccessDeniedError,
  CourseAccessExpiredError,
  DiscussionNotFoundError,
  LessonNotFoundError,
  ModuleNotFoundError,
  QuizNotFoundError,
  SubmissionNotFoundError,
} from "../errors/error";

export interface ICourseAccessService {
  // Viewing/using course content: admin, assigned instructor, or a student with a live enrollment
  assertCanLearn(user: IAuthUserPayload, courseId: string): Promise<void>;
  // Managing a course's students/grades: admin or assigned instructor
  assertCanManage(user: IAuthUserPayload, courseId: string): Promise<void>;

  // Resolve the course that a nested resource belongs to
  courseIdForModule(moduleId: string): Promise<string>;
  courseIdForLesson(lessonId: string): Promise<string>;
  courseIdForQuiz(quizId: string): Promise<string>;
  courseIdForAttempt(attemptId: string, user: IAuthUserPayload): Promise<string>;
  courseIdForSubmission(submissionId: string): Promise<string>;
  courseIdForDiscussion(discussionId: string, expectedCourseId: string): Promise<string>;
}

export class CourseAccessService implements ICourseAccessService {
  constructor(
    private readonly courseRepository: ICourseRepository,
    private readonly contentRepository: ICourseContentRepository,
    private readonly quizRepository: IQuizRepository,
    private readonly attemptRepository: IQuizAttemptRepository,
    private readonly submissionRepository: IAssignmentSubmissionRepository,
    private readonly discussionRepository: IDiscussionRepository
  ) {}

  public async assertCanLearn(user: IAuthUserPayload, courseId: string): Promise<void> {
    if (user.role === UserRole.ADMIN) return;

    if (user.role === UserRole.INSTRUCTOR) {
      await this.assertInstructorAssigned(user.id, courseId);
      return;
    }

    if (user.role === UserRole.STUDENT) {
      const enrollment = Types.ObjectId.isValid(courseId)
        ? await this.courseRepository.findEnrollment(user.id, courseId)
        : null;

      if (!enrollment || enrollment.status === EnrollmentStatus.DROPPED) {
        throw new CourseAccessDeniedError("You are not enrolled in this course");
      }
      if (isAccessExpired(enrollment)) {
        throw new CourseAccessExpiredError(new Date(enrollment.accessExpiresAt!));
      }
      return;
    }

    throw new CourseAccessDeniedError();
  }

  public async assertCanManage(user: IAuthUserPayload, courseId: string): Promise<void> {
    if (user.role === UserRole.ADMIN) return;

    if (user.role === UserRole.INSTRUCTOR) {
      await this.assertInstructorAssigned(user.id, courseId);
      return;
    }

    throw new CourseAccessDeniedError();
  }

  public async courseIdForModule(moduleId: string): Promise<string> {
    const module = await this.contentRepository.findModuleById(moduleId);
    if (!module) throw new ModuleNotFoundError(`Module ${moduleId} not found`);
    return module.course.toString();
  }

  public async courseIdForLesson(lessonId: string): Promise<string> {
    const lesson = await this.contentRepository.findLessonById(lessonId);
    if (!lesson) throw new LessonNotFoundError(`Lesson ${lessonId} not found`);
    return lesson.course.toString();
  }

  public async courseIdForQuiz(quizId: string): Promise<string> {
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) throw new QuizNotFoundError(`Quiz ${quizId} not found`);
    return quiz.course.toString();
  }

  public async courseIdForAttempt(attemptId: string, user: IAuthUserPayload): Promise<string> {
    const attempt = await this.attemptRepository.findById(attemptId);
    // Students may only act on their own attempts; report others as not found to avoid leaking ids
    if (!attempt || (user.role === UserRole.STUDENT && attempt.student.toString() !== user.id)) {
      throw new AttemptNotFoundError(`Attempt ${attemptId} not found`);
    }
    return attempt.course.toString();
  }

  public async courseIdForSubmission(submissionId: string): Promise<string> {
    const submission = await this.submissionRepository.findById(submissionId);
    if (!submission) throw new SubmissionNotFoundError(`Submission ${submissionId} not found`);
    return submission.course.toString();
  }

  public async courseIdForDiscussion(discussionId: string, expectedCourseId: string): Promise<string> {
    const discussion = await this.discussionRepository.findById(discussionId);
    // The discussion must belong to the course in the URL, otherwise access checks could be bypassed
    if (!discussion || this.idOf(discussion.course) !== expectedCourseId) {
      throw new DiscussionNotFoundError(`Discussion ${discussionId} not found`);
    }
    return expectedCourseId;
  }

  private async assertInstructorAssigned(instructorId: string, courseId: string): Promise<void> {
    const assigned = Types.ObjectId.isValid(courseId)
      && await this.courseRepository.isInstructorAssigned(instructorId, courseId);
    if (!assigned) {
      throw new CourseAccessDeniedError("You are not assigned to this course");
    }
  }

  // Handles both raw ObjectIds and populated documents
  private idOf(ref: unknown): string {
    if (ref && typeof ref === "object" && "_id" in ref) {
      return String((ref as { _id: unknown })._id);
    }
    return String(ref);
  }
}
