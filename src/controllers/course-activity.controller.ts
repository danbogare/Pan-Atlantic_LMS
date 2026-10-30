import { Request, Response } from "express";
import { ICourseActivityService } from "../services/course-activity.service";
import { successResponse } from "../utils/response";
import { parseQuery } from "../utils/query";
import { courseQuizAttemptsQuerySchema, courseSubmissionsQuerySchema } from "../validators/activity.validator";

export interface ICourseActivityController {
  getStudentActivity: (req: Request, res: Response) => Promise<void>;
  getCourseSubmissions: (req: Request, res: Response) => Promise<void>;
  getCourseQuizAttempts: (req: Request, res: Response) => Promise<void>;
}

export class CourseActivityController implements ICourseActivityController {
  constructor(private readonly activityService: ICourseActivityService) {}

  // GET /courses/{courseId}/students/{studentId}/activity — one student's submissions and quiz attempts, by lesson
  public getStudentActivity = async (req: Request, res: Response): Promise<void> => {
    const { courseId, studentId } = req.params;
    const activity = await this.activityService.getStudentActivity(courseId as string, studentId as string);
    successResponse(res, "Student activity retrieved successfully", activity);
  };

  // GET /courses/{courseId}/submissions
  public getCourseSubmissions = async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const filter = parseQuery(courseSubmissionsQuerySchema, req.query);
    const submissions = await this.activityService.getCourseSubmissions(courseId as string, filter);
    successResponse(res, "Course submissions retrieved successfully", submissions);
  };

  // GET /courses/{courseId}/quiz-attempts
  public getCourseQuizAttempts = async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const filter = parseQuery(courseQuizAttemptsQuerySchema, req.query);
    const attempts = await this.activityService.getCourseQuizAttempts(courseId as string, filter);
    successResponse(res, "Course quiz attempts retrieved successfully", attempts);
  };
}
