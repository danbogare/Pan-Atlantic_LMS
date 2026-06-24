import { Request, Response } from "express";
import { IAuthService } from "../services/auth.service";
import { successResponse } from "../utils/response";
import { ChangePasswordInput, ForgotPasswordInput, LoginInput, ResetPasswordInput } from "../validators/auth.validator";
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

  public changePassword = async (req: Request<{}, {}, ChangePasswordInput>, res: Response) => {
    const { oldPassword, newPassword } = req.body;

    const id = req.user?.id as string;

    await this.authService.changePassword(id, oldPassword, newPassword);

    successResponse(res, "password changed successfully.", {});
  };

  public forgotPassword = async (req: Request<{}, {}, ForgotPasswordInput>, res: Response) => {
    const { email } = req.body;

    await this.authService.requestPasswordReset(email);

    successResponse(res, "password reset mail sent successfully.", {});
  }

  public resetPassword = async (req: Request<{}, {}, ResetPasswordInput>, res: Response) => {
    const { email, otp, newPassword } = req.body;

    await this.authService.resetPassword(email, otp, newPassword);

    successResponse(res, "password reset successfully.", {});
  }
}