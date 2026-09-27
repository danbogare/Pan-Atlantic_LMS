import { IStatsRepository } from "../repositories/stats.repository";
import { UserRole } from "../models/user.model";
import { InstructorStats, PlatformStats } from "../interfaces/stats.interface";

export interface IStatsService {
  getPlatformStats(): Promise<PlatformStats>;
  getInstructorStats(instructorId: string): Promise<InstructorStats>;
}

export class StatsService implements IStatsService {
  constructor(private readonly statsRepository: IStatsRepository) {}

  public async getPlatformStats(): Promise<PlatformStats> {
    const [students, instructors, courses, enrollment, byCourse, averageCompletionRate] =
      await Promise.all([
        this.statsRepository.getUserStats(UserRole.STUDENT),
        this.statsRepository.getUserStats(UserRole.INSTRUCTOR),
        this.statsRepository.getCourseStats(),
        this.statsRepository.getEnrollmentStats(),
        this.statsRepository.getTopEnrolledCourses(5),
        this.statsRepository.getAverageCompletionRate(),
      ]);

    return {
      students,
      instructors,
      courses,
      enrollment: {
        ...enrollment,
        byCourse,
      },
      progress: {
        averageCompletionRate,
      },
    };
  }

  public async getInstructorStats(instructorId: string): Promise<InstructorStats> {
    const courseIds = await this.statsRepository.getInstructorCourseIds(instructorId);

    const [overview, questions, courseProgress] = await Promise.all([
      this.statsRepository.getInstructorOverview(courseIds),
      this.statsRepository.getQuestionStats(courseIds),
      this.statsRepository.getCourseProgressOverview(courseIds),
    ]);

    return { overview, questions, courseProgress };
  }
}