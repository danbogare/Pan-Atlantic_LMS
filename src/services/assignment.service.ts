import { IAssignmentSubmissionRepository } from "../repositories/assignment.repository";
import { ICourseContentRepository } from "../repositories/courseModule.repository";
import { IAssignmentSubmission } from "../models/assignment.model";
import { ContentType } from "../models/courseModule.model";
import { LessonNotFoundError, InvalidAssignmentLessonError, SubmissionNotFoundError } from "../errors/error";
import { Types } from "mongoose";
import { SubmitAssignmentPayload } from "../interfaces/assignment.interface";

export interface IAssignmentSubmissionService {
  submitAssignment(studentId: string, lessonId: string, data: SubmitAssignmentPayload): Promise<IAssignmentSubmission>;
  getStudentAssignments(studentId: string): Promise<any[]>;
  getSubmissionHistory(studentId: string, lessonId: string): Promise<IAssignmentSubmission[]>;
  gradeSubmission(submissionId: string, grade: number, feedback: string, gradedBy: string): Promise<IAssignmentSubmission>;
}

export class AssignmentSubmissionService implements IAssignmentSubmissionService {
  constructor(
    private readonly submissionRepository: IAssignmentSubmissionRepository,
    private readonly contentRepository: ICourseContentRepository
  ) {}

  public async submitAssignment(
    studentId: string,
    lessonId: string,
    data: SubmitAssignmentPayload
  ): Promise<IAssignmentSubmission> {
    const lesson = await this.contentRepository.findLessonById(lessonId);
    if (!lesson) {
      throw new LessonNotFoundError(`Lesson ${lessonId} not found`);
    }
    if (lesson.contentType !== ContentType.ASSIGNMENT) {
      throw new InvalidAssignmentLessonError(`Lesson ${lessonId} is not an assignment`);
    }

    return await this.submissionRepository.create({
      student: new Types.ObjectId(studentId),
      lesson: new Types.ObjectId(lessonId),
      course: lesson.course,
      content: data.content,
      fileUrl: data.fileUrl,
    });
  }

  public async getStudentAssignments(studentId: string): Promise<any[]> {
    return await this.submissionRepository.getStudentAssignments(studentId);
  }

  public async getSubmissionHistory(studentId: string, lessonId: string): Promise<IAssignmentSubmission[]> {
    return await this.submissionRepository.getSubmissionHistory(studentId, lessonId);
  }

  public async gradeSubmission(
    submissionId: string,
    grade: number,
    feedback: string,
    gradedBy: string
  ): Promise<IAssignmentSubmission> {
    const graded = await this.submissionRepository.grade(submissionId, grade, feedback, gradedBy);
    if (!graded) {
      throw new SubmissionNotFoundError(`Submission ${submissionId} not found`);
    }
    return graded;
  }
}