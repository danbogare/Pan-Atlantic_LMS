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

export interface InstructorOverview {
  totalCourses: number;
  totalStudents: number;
  activeStudents: number;
  averageProgress: number;
}

export interface InstructorQuestionStats {
  pending: number;
  answered: number;
  responseRate: number; // percentage
}

export interface InstructorCourseProgress {
  courseId: string;
  title: string;
  enrolled: number;
  averageCompletion: number;
}

export interface InstructorStats {
  overview: InstructorOverview;
  questions: InstructorQuestionStats;
  courseProgress: InstructorCourseProgress[];
}