import { Request, Response } from "express";
import { IUserService } from "../services/user.service";
import { createdSuccessResponse } from "../utils/response";
import { EnrollStudentInput } from "../validators/student.validator";
import { EnrollStudentPayload } from "../interfaces/user.interface";

export interface IUserController {
  enrollStudent: (req: Request<{}, {}, EnrollStudentInput>, res: Response) => Promise<void>;
  inviteInstructor: (req: Request<{}, {}, EnrollStudentInput>, res: Response) => Promise<void>
}
export class UserController {
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
}