import { Request, Response } from "express";
import { IUserService } from "../services/user.service";
import { createdSuccessResponse, successResponse } from "../utils/response";
import { EnrollStudentInput } from "../validators/student.validator";
import { EnrollStudentPayload } from "../interfaces/user.interface";

export interface IUserController {
  enrollStudent: (req: Request<{}, {}, EnrollStudentInput>, res: Response) => Promise<void>;
  inviteInstructor: (req: Request<{}, {}, EnrollStudentInput>, res: Response) => Promise<void>
  getAllStudents: (req: Request, res: Response) => Promise<void>;
  getAllInstructors: (req: Request, res: Response) => Promise<void>;
  getStudentById: (req: Request, res: Response) => Promise<void>;
  getInstructorById: (req: Request, res: Response) => Promise<void>;
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
    await this.userService.inviteStudent(enrollmentdata, assignedById);

    createdSuccessResponse(res, "invite email sent successfully.", {});
  };
  
  public inviteInstructor = async (req: Request<{}, {}, EnrollStudentInput>, res: Response): Promise<void> => {
    const { firstName, lastName, email, assignedCourseIds } = req.body;
    const assignedById = req.user?.id as string;

    const enrollmentdata: EnrollStudentPayload = {
      firstName,
      lastName,
      email,
      courseIds: assignedCourseIds
    }
    await this.userService.inviteInstructor(enrollmentdata, assignedById);

    createdSuccessResponse(res, "invite email sent successfully.", {});
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