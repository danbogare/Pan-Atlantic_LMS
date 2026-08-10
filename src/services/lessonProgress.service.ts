import { ILessonProgressRepository } from "../repositories/lessonProgress.repository";
import { ICourseRepository } from "../repositories/course.repository";
import { ICertificateService } from "./certificate.service";
import { IBadgeService } from "./badge.service";
import { EnrollmentStatus, IEnrollment } from "../models/course.model";
import { LessonNotFoundError } from "../errors/error";
import { Types } from "mongoose";

export interface IProgressService {
  getStudentEnrollments(studentId: string): Promise<IEnrollment[]>;
  markLessonComplete(studentId: string, courseId: string, moduleId: string, lessonId: string): Promise<{ progress: number; completed: boolean }>;
  getCourseProgress(studentId: string, courseId: string): Promise<{ progress: number; completedLessonIds: string[] }>;
}

export class ProgressService implements IProgressService {
  constructor(
    private readonly lessonProgressRepository: ILessonProgressRepository,
    private readonly courseRepository: ICourseRepository,
    private readonly certificateService: ICertificateService,
    private readonly badgeService: IBadgeService
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

    // Idempotent — re-marking an already-completed lesson is a safe no-op
    await this.lessonProgressRepository.markComplete({
      student: new Types.ObjectId(studentId),
      course: new Types.ObjectId(courseId),
      module: new Types.ObjectId(moduleId),
      lesson: new Types.ObjectId(lessonId),
    });

    const progress = await this.lessonProgressRepository.getCourseProgressPercent(studentId, courseId);
    const completed = progress >= 100;

    if (completed) {
      // updateEnrollmentStatus already sets progress: 100 and completedAt
      await this.courseRepository.updateEnrollmentStatus(
        enrollment._id.toString(),
        EnrollmentStatus.COMPLETED
      );

      await this.certificateService.issueCertificate(
        studentId,
        courseId,
        enrollment._id.toString()
      );
    } else {
      await this.courseRepository.updateEnrollmentProgress(enrollment._id.toString(), progress);
    }

    // Only worth checking on an actual completion — that's the sole trigger
    // for COURSES_COMPLETED-type badges, and avoids a badge scan on every tick
    if (completed) {
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
}