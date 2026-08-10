import { Model, Types } from 'mongoose';
import { IAssignmentSubmission, SubmissionStatus } from '../models/assignment.model';
import { ICourseLesson, ContentType } from '../models/courseModule.model';
import { IEnrollment } from '../models/course.model';

export interface IAssignmentSubmissionRepository {
  create(submissionData: Partial<IAssignmentSubmission>): Promise<IAssignmentSubmission>;
  findById(id: string): Promise<IAssignmentSubmission | null>;
  getLatestSubmission(studentId: string, lessonId: string): Promise<IAssignmentSubmission | null>;
  getSubmissionHistory(studentId: string, lessonId: string): Promise<IAssignmentSubmission[]>;
  grade(id: string, grade: number, feedback: string, gradedBy: string): Promise<IAssignmentSubmission | null>;
  getStudentAssignments(studentId: string): Promise<any[]>;
}

export class AssignmentSubmissionRepository implements IAssignmentSubmissionRepository {
  constructor(
    private readonly submissionModel: Model<IAssignmentSubmission>,
    private readonly lessonModel: Model<ICourseLesson>,
    private readonly enrollmentModel: Model<IEnrollment>
  ) {}

  public async create(submissionData: Partial<IAssignmentSubmission>): Promise<IAssignmentSubmission> {
    return await this.submissionModel.create(submissionData);
  }

  public async findById(id: string): Promise<IAssignmentSubmission | null> {
    return await this.submissionModel.findById(id).exec();
  }

  public async getLatestSubmission(
    studentId: string,
    lessonId: string
  ): Promise<IAssignmentSubmission | null> {
    return await this.submissionModel
      .findOne({ student: studentId, lesson: lessonId })
      .sort({ submittedAt: -1 })
      .exec();
  }

  public async getSubmissionHistory(
    studentId: string,
    lessonId: string
  ): Promise<IAssignmentSubmission[]> {
    return await this.submissionModel
      .find({ student: studentId, lesson: lessonId })
      .sort({ submittedAt: -1 })
      .exec();
  }

  public async grade(
    id: string,
    grade: number,
    feedback: string,
    gradedBy: string
  ): Promise<IAssignmentSubmission | null> {
    return await this.submissionModel
      .findByIdAndUpdate(
        id,
        {
          grade,
          feedback,
          gradedBy,
          gradedAt: new Date(),
          status: SubmissionStatus.GRADED,
        },
        { new: true }
      )
      .exec();
  }

  // Every assignment lesson in the student's enrolled courses, joined against
  // their latest submission (if any) so "not yet submitted" is visible too.
  public async getStudentAssignments(studentId: string): Promise<any[]> {
    const enrollments = await this.enrollmentModel
      .find({ student: studentId })
      .select('course')
      .lean();
    const courseIds = enrollments.map((e) => e.course);

    const assignmentLessons = await this.lessonModel
      .find({ course: { $in: courseIds }, contentType: ContentType.ASSIGNMENT })
      .populate('course', 'title')
      .lean();

    const lessonIds = assignmentLessons.map((l) => l._id);

    const submissions = await this.submissionModel
      .aggregate([
        { $match: { student: new Types.ObjectId(studentId), lesson: { $in: lessonIds } } },
        { $sort: { submittedAt: -1 } },
        { $group: { _id: '$lesson', latest: { $first: '$$ROOT' } } },
      ])
      .exec();

    const submissionByLesson = new Map(
      submissions.map((s) => [s._id.toString(), s.latest])
    );

    return assignmentLessons.map((lesson) => ({
      lesson,
      submission: submissionByLesson.get((lesson._id as Types.ObjectId).toString()) || null,
    }));
  }
}