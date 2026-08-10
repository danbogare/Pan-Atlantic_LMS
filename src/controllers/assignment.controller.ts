import { Request, Response } from "express";
import { IAssignmentSubmissionService } from "../services/assignment.service";
import { createdSuccessResponse, successResponse } from "../utils/response";
import { SubmitAssignmentInput, GradeSubmissionInput } from "../validators/assignment.validator";

export interface IAssignmentSubmissionController {
  submitAssignment: (req: Request<{ lessonId: string }, {}, SubmitAssignmentInput>, res: Response) => Promise<void>;
  getStudentAssignments: (req: Request, res: Response) => Promise<void>;
  getSubmissionHistory: (req: Request, res: Response) => Promise<void>;
  gradeSubmission: (req: Request<{ submissionId: string }, {}, GradeSubmissionInput>, res: Response) => Promise<void>;
}

export class AssignmentSubmissionController implements IAssignmentSubmissionController {
  constructor(private readonly submissionService: IAssignmentSubmissionService) {}

  public submitAssignment = async (
    req: Request<{ lessonId: string }, {}, SubmitAssignmentInput>,
    res: Response
  ): Promise<void> => {
    const studentId = req.user?.id as string;
    const { lessonId } = req.params;
    const { content, fileUrl } = req.body;

    const submission = await this.submissionService.submitAssignment(studentId, lessonId, { content, fileUrl });

    createdSuccessResponse(res, "assignment submitted successfully", submission);
  };

  public getStudentAssignments = async (req: Request, res: Response): Promise<void> => {
    const studentId = req.user?.id as string;
    const assignments = await this.submissionService.getStudentAssignments(studentId);
    successResponse(res, "assignments retrieved successfully", assignments);
  };

  public getSubmissionHistory = async (req: Request, res: Response): Promise<void> => {
    const studentId = req.user?.id as string;
    const { lessonId } = req.params;

    const history = await this.submissionService.getSubmissionHistory(studentId, lessonId as string);

    successResponse(res, "submission history retrieved successfully", history);
  };

  public gradeSubmission = async (
    req: Request<{ submissionId: string }, {}, GradeSubmissionInput>,
    res: Response
  ): Promise<void> => {
    const gradedBy = req.user?.id as string;
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;

    const graded = await this.submissionService.gradeSubmission(submissionId, grade, feedback, gradedBy);

    successResponse(res, "submission graded successfully", graded);
  };
}