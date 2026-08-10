export interface PlatformStats {
  students: { total: number; active: number; disabled: number };
  instructors: { total: number; active: number; disabled: number };
  courses: { total: number; published: number; draft: number; archived: number };
  enrollment: {
    total: number;
    averagePerCourse: number;
    byCourse: { courseId: string; title: string; enrolled: number }[];
  };
  progress: { averageCompletionRate: number };
}