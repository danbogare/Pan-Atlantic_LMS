import { ILessonProgressRepository } from "../repositories/lessonProgress.repository";
import { ICourseRepository } from "../repositories/course.repository";
import { ICourseContentRepository } from "../repositories/courseModule.repository";
import { IUserRepository } from "../repositories/user.repository";
import { IQuizAttemptRepository, IQuizRepository } from "../repositories/quiz.repository";
import { IAssignmentSubmissionRepository } from "../repositories/assignment.repository";
import { ICertificateService } from "./certificate.service";
import { IBadgeService } from "./badge.service";
import { EnrollmentStatus, IEnrollment } from "../models/course.model";
import { ContentType, ICourseLesson } from "../models/courseModule.model";
import { SubmissionStatus } from "../models/assignment.model";
import { BadRequestError, LessonNotFoundError, LessonRequirementNotMetError } from "../errors/error";
import { nextLearningStreak } from "../utils/streak";
import { Types } from "mongoose";

export interface IProgressService {
  getStudentEnrollments(studentId: string): Promise<IEnrollment[]>;
  markLessonComplete(studentId: string, courseId: string, moduleId: string, lessonId: string): Promise<{ progress: number; completed: boolean }>;
  getCourseProgress(studentId: string, courseId: string): Promise<{ progress: number; completedLessonIds: string[] }>;
  // Re-syncs every active enrollment's stored progress after the course's lessons changed
  recalculateCourseProgress(courseId: string): Promise<void>;
  // Drops progress records of deleted lessons, then re-syncs the course
  handleLessonsRemoved(courseId: string, lessonIds: string[]): Promise<void>;
}

export class ProgressService implements IProgressService {
  constructor(
    private readonly lessonProgressRepository: ILessonProgressRepository,
    private readonly courseRepository: ICourseRepository,
    private readonly certificateService: ICertificateService,
    private readonly badgeService: IBadgeService,
    private readonly contentRepository: ICourseContentRepository,
    private readonly userRepository: IUserRepository,
    private readonly quizRepository: IQuizRepository,
    private readonly quizAttemptRepository: IQuizAttemptRepository,
    private readonly submissionRepository: IAssignmentSubmissionRepository
  ) {}

  // Backs GET /student/progress — course-level % per enrollment.
  // Kept as a thin passthrough here rather than in the controller, so the
  // controller only ever talks to IProgressService, matching the rest of
  // the codebase's controller -> service -> repository layering.
  public async getStudentEnrollments(studentId: string): Promise<IEnrollment[]> {
    return await this.courseRepository.getStudentEnrollments(studentId);
  }

  public async markLessonComplete(
    studentId: string,
    courseId: string,
    moduleId: string,
    lessonId: string
  ): Promise<{ progress: number; completed: boolean }> {
    const enrollment = await this.courseRepository.findEnrollment(studentId, courseId);
    if (!enrollment) {
      throw new LessonNotFoundError(`Student is not enrolled in course ${courseId}`);
    }

    // Only real lessons of this course count, otherwise any id would inflate the progress
    const lesson = await this.contentRepository.findLessonById(lessonId);
    if (!lesson || lesson.course.toString() !== courseId) {
      throw new LessonNotFoundError(`Lesson ${lessonId} not found in this course`);
    }
    if (lesson.module.toString() !== moduleId) {
      throw new BadRequestError("Lesson does not belong to the given module");
    }

    const wasComplete = await this.lessonProgressRepository.isLessonComplete(studentId, lessonId);
    if (!wasComplete) {
      await this.ensureRequirementsMet(studentId, lesson);
    }

    // Idempotent — re-marking an already-completed lesson is a safe no-op
    await this.lessonProgressRepository.markComplete({
      student: new Types.ObjectId(studentId),
      course: new Types.ObjectId(courseId),
      module: new Types.ObjectId(moduleId),
      lesson: new Types.ObjectId(lessonId),
    });

    const progress = await this.lessonProgressRepository.getCourseProgressPercent(studentId, courseId);
    const { completed, newlyCompleted } = await this.applyProgress(enrollment, progress);

    // Only a newly completed lesson counts as learning activity for the streak
    const streakChanged = !wasComplete && (await this.recordActivity(studentId));

    // Badge thresholds can only move on a completion or a streak change, so skip the scan otherwise
    if (newlyCompleted || streakChanged) {
      await this.badgeService.checkAndAwardBadges(studentId);
    }

    return { progress, completed };
  }

  public async getCourseProgress(
    studentId: string,
    courseId: string
  ): Promise<{ progress: number; completedLessonIds: string[] }> {
    const [progress, completedLessonIds] = await Promise.all([
      this.lessonProgressRepository.getCourseProgressPercent(studentId, courseId),
      this.lessonProgressRepository.getCompletedLessonIds(studentId, courseId),
    ]);

    return { progress, completedLessonIds };
  }

  public async recalculateCourseProgress(courseId: string): Promise<void> {
    const enrollments = await this.courseRepository.findActiveEnrollmentsByCourse(courseId);
    for (const enrollment of enrollments) {
      const studentId = enrollment.student.toString();
      const progress = await this.lessonProgressRepository.getCourseProgressPercent(studentId, courseId);
      const { newlyCompleted } = await this.applyProgress(enrollment, progress);
      if (newlyCompleted) {
        await this.badgeService.checkAndAwardBadges(studentId);
      }
    }
  }

  public async handleLessonsRemoved(courseId: string, lessonIds: string[]): Promise<void> {
    await this.lessonProgressRepository.deleteByLessons(lessonIds);
    await this.recalculateCourseProgress(courseId);
  }

  // Stores the progress on the enrollment, completing it (and issuing the certificate) the first time it hits 100.
  // A completed enrollment stays completed, even if lessons are added later.
  private async applyProgress(
    enrollment: IEnrollment,
    progress: number
  ): Promise<{ completed: boolean; newlyCompleted: boolean }> {
    if (enrollment.status === EnrollmentStatus.COMPLETED) {
      return { completed: true, newlyCompleted: false };
    }

    const enrollmentId = enrollment._id.toString();
    if (progress < 100) {
      if (enrollment.progress !== progress) {
        await this.courseRepository.updateEnrollmentProgress(enrollmentId, progress);
      }
      return { completed: false, newlyCompleted: false };
    }

    // updateEnrollmentStatus already sets progress: 100 and completedAt
    await this.courseRepository.updateEnrollmentStatus(enrollmentId, EnrollmentStatus.COMPLETED);
    await this.certificateService.issueCertificate(
      enrollment.student.toString(),
      enrollment.course.toString(),
      enrollmentId
    );
    return { completed: true, newlyCompleted: true };
  }

  // Quiz lessons need a passing attempt; assignment lessons a submission that wasn't sent back for resubmission
  private async ensureRequirementsMet(studentId: string, lesson: ICourseLesson): Promise<void> {
    const lessonId = lesson._id.toString();

    if (lesson.contentType === ContentType.QUIZ) {
      const quiz = await this.quizRepository.findByLesson(lessonId);
      // No quiz set up yet: nothing to pass
      if (quiz && !(await this.quizAttemptRepository.hasPassedAttempt(studentId, quiz._id.toString()))) {
        throw new LessonRequirementNotMetError("Pass this lesson's quiz before marking it complete");
      }
    }

    if (lesson.contentType === ContentType.ASSIGNMENT) {
      const submission = await this.submissionRepository.getLatestSubmission(studentId, lessonId);
      if (!submission) {
        throw new LessonRequirementNotMetError("Submit this lesson's assignment before marking it complete");
      }
      if (submission.status === SubmissionStatus.RESUBMIT_REQUESTED) {
        throw new LessonRequirementNotMetError("Your assignment was sent back for resubmission; resubmit it before marking the lesson complete");
      }
    }
  }

  // Updates the learning streak for activity now; returns whether the streak value changed
  private async recordActivity(studentId: string): Promise<boolean> {
    const user = await this.userRepository.findById(studentId);
    if (!user) return false;

    const now = new Date();
    const previous = user.learningStreak ?? 0;
    const streak = nextLearningStreak(previous, user.lastActivityAt, now);
    await this.userRepository.updateStreak(studentId, streak, now);
    return streak !== previous;
  }
}
