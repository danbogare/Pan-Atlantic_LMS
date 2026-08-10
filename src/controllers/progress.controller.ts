import { Request, Response } from "express";
import { IProgressService } from "../services/lessonProgress.service";
import { successResponse } from "../utils/response";
import { MarkLessonCompleteInput } from "../validators/progress.validator";

export interface IProgressController {
  getAllProgress: (req: Request, res: Response) => Promise<void>;
  getCourseProgress: (req: Request, res: Response) => Promise<void>;
  markLessonComplete: (req: Request<{ courseId: string }, {}, MarkLessonCompleteInput>, res: Response) => Promise<void>;
}

export class ProgressController implements IProgressController {
  constructor(private readonly progressService: IProgressService) {}

  // GET /student/progress — all enrollments with their course-level %
  public getAllProgress = async (req: Request, res: Response): Promise<void> => {
    const studentId = req.user?.id as string;
    const enrollments = await this.progressService.getStudentEnrollments(studentId);
    successResponse(res, "progress retrieved successfully", enrollments);
  };

  // GET /student/progress/{courseId} — per-lesson breakdown for one course
  public getCourseProgress = async (req: Request, res: Response): Promise<void> => {
    const studentId = req.user?.id as string;
    const { courseId } = req.params;

    const progress = await this.progressService.getCourseProgress(studentId, courseId as string);

    successResponse(res, "course progress retrieved successfully", progress);
  };

  public markLessonComplete = async (
    req: Request<{ courseId: string }, {}, MarkLessonCompleteInput>,
    res: Response
  ): Promise<void> => {
    const studentId = req.user?.id as string;
    const { courseId } = req.params;
    const { moduleId, lessonId } = req.body;

    const result = await this.progressService.markLessonComplete(studentId, courseId, moduleId, lessonId);

    successResponse(res, "lesson marked complete", result);
  };
}