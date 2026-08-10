import { IStatsRepository } from "../repositories/stats.repository";
import { UserRole } from "../models/user.model";
import { PlatformStats } from "../interfaces/stats.interface";

export interface IStatsService {
  getPlatformStats(): Promise<PlatformStats>;
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
}