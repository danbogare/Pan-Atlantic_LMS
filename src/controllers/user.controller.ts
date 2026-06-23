import { Request, Response } from "express";
import { IUserService } from "../services/user.service";
import { createdSuccessResponse } from "../utils/response";
import { EnrollStudentInput } from "../validators/student.validator";

export class UserController {
  constructor(private readonly userService: IUserService) {}

  public enrollStudent = async (req: Request<{}, {}, EnrollStudentInput>, res: Response) => {
    const { firstName, lastName, email } = req.body;

    await this.userService.inviteStudent(firstName, lastName, email);

    createdSuccessResponse(res, "Student invited successfully.", {});
  };
}