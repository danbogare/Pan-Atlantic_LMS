import { Request, Response } from "express";
import { IUserService } from "../services/user.service";
import { createdSuccessResponse, successResponse } from "../utils/response";
import { EnrollStudentInput } from "../validators/student.validator";
import { EnrollStudentPayload, InviteInstructorPayload } from "../interfaces/user.interface";
import { InviteInstructorInput } from "../validators/instructor.validator";
import { UpdateProfileInput, UpdateUserInfoInput } from "../validators/user.validator";

export interface IUserController {
  enrollStudent: (req: Request<{}, {}, EnrollStudentInput>, res: Response) => Promise<void>;
  inviteInstructor: (req: Request<{}, {}, InviteInstructorInput>, res: Response) => Promise<void>;
  updateUserInfo: (req: Request<{ id: string }, {}, UpdateUserInfoInput>, res: Response) => Promise<void>;
  getAllStudents: (req: Request, res: Response) => Promise<void>;
  getAllInstructors: (req: Request, res: Response) => Promise<void>;
  getStudentById: (req: Request, res: Response) => Promise<void>;
  getInstructorById: (req: Request, res: Response) => Promise<void>;
  getMyProfile: (req: Request, res: Response) => Promise<void>;
  updateMyProfile: (req: Request<{}, {}, UpdateProfileInput>, res: Response) => Promise<void>;
}
export class UserController implements IUserController {
  constructor(private readonly userService: IUserService) {}

  public enrollStudent = async (req: Request<{}, {}, EnrollStudentInput>, res: Response): Promise<void> => {
    const { firstName, lastName, email, assignedCourseIds } = req.body;
    const assignedById = req.user?.id as string;

    const enrollmentdata: EnrollStudentPayload = {
      firstName,
      lastName,
      email,
      courseIds: assignedCourseIds
    }
    const result = await this.userService.inviteStudent(enrollmentdata, assignedById);

    const message = result.isNewAccount
      ? "Student account created, invite email sent and enrolled successfully."
      : "Existing student enrolled successfully, no invite email sent.";
    createdSuccessResponse(res, message, result);
  };
  
  public inviteInstructor = async (req: Request<{}, {}, InviteInstructorInput>, res: Response): Promise<void> => {
    const { firstName, lastName, email, assignedCourseIds } = req.body;
    const assignedById = req.user?.id as string;

    const invitationData: InviteInstructorPayload = {
      firstName,
      lastName,
      email,
      courseIds: assignedCourseIds
    }
    await this.userService.inviteInstructor(invitationData, assignedById);

    createdSuccessResponse(res, "invite email sent successfully.", {});
  };
  
  public updateUserInfo = async (req: Request<{ id: string }, {}, UpdateUserInfoInput>, res: Response): Promise<void> => {
    const { firstName, lastName } = req.body;
    const id = req.params.id;

    const user = await this.userService.updateUserInfo(id, firstName, lastName);

    successResponse(res, "user info updated successfully.", user);
  };

  public getMyProfile = async (req: Request, res: Response): Promise<void> => {
    const user = await this.userService.getProfile(req.user!.id);
    successResponse(res, "profile retrieved successfully.", user);
  };

  public updateMyProfile = async (req: Request<{}, {}, UpdateProfileInput>, res: Response): Promise<void> => {
    const { firstName, lastName } = req.body;
    const user = await this.userService.updateProfile(req.user!.id, { firstName, lastName });
    successResponse(res, "profile updated successfully.", user);
  };

  public getAllStudents = async (_req: Request, res: Response): Promise<void> => {
    const students = await this.userService.getAllStudents();
    successResponse(res, "students details retrieved successfully", students);
  }

  public getAllInstructors = async (_req: Request, res: Response): Promise<void> => {
    const instructors = await this.userService.getAllInstructors();
    successResponse(res, "instructors details retrieved successfully", instructors);
  }

  public getStudentById = async (req: Request, res: Response): Promise<void> => {
    const { studentId } = req.params;
    const student = await this.userService.getStudentByIdWithCourses(studentId as string);
    successResponse(res, "student details retrieved successfully", student);
  }

  public getInstructorById = async (req: Request, res: Response): Promise<void> => {
    const { instructorId } = req.params;
    const instructor = await this.userService.getInstructorByIdWithCourses(instructorId as string);
    successResponse(res, "instructor details retrieved successfully", instructor);
  }
}