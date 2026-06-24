import { Request, Response } from "express";
import { IAuthService } from "../services/auth.service";
import { successResponse } from "../utils/response";
import { LoginInput } from "../validators/auth.validator";
import { IUser } from "../models/user.model";
import { InvalidCredentialError } from "../errors/error";

export class AuthController {
  constructor(private readonly authService: IAuthService) {}

  public login = async (req: Request<{}, {}, LoginInput>, res: Response) => {
    const { email, password } = req.body;

    const user: IUser | null = await this.authService.authUser(email, password);
    if (!user) throw new InvalidCredentialError();

    successResponse(res, "logged in successfully.", user);
  };
}