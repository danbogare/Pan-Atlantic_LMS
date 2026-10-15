import { Request, Response } from "express";
import { IAuthService } from "../services/auth.service";
import { createdSuccessResponse, successResponse } from "../utils/response";
import {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "../validators/auth.validator";
import { InvalidCredentialError } from "../errors/error";
import { IAuthUser } from "../interfaces/auth.interface";

export interface IAuthController {
  login: (req: Request<{}, {}, LoginInput>, res: Response) => Promise<void>;
  register: (req: Request<{}, {}, RegisterInput>, res: Response) => Promise<void>;
  verifyEmail: (req: Request<{}, {}, VerifyEmailInput>, res: Response) => Promise<void>;
  resendVerification: (req: Request<{}, {}, ResendVerificationInput>, res: Response) => Promise<void>;
  changePassword: (req: Request<{}, {}, ChangePasswordInput>, res: Response) => Promise<void>;
  forgotPassword: (req: Request<{}, {}, ForgotPasswordInput>, res: Response) => Promise<void>;
  resetPassword: (req: Request<{}, {}, ResetPasswordInput>, res: Response) => Promise<void>;
}
export class AuthController implements IAuthController {
  constructor(private readonly authService: IAuthService) {}

  public login = async (req: Request<{}, {}, LoginInput>, res: Response): Promise<void> => {
    const { email, password } = req.body;

    const authUser: IAuthUser = await this.authService.authUser(email, password);
    if (!authUser.user) throw new InvalidCredentialError();

    successResponse(res, "logged in successfully.", authUser);
  };

  public register = async (req: Request<{}, {}, RegisterInput>, res: Response): Promise<void> => {
    const { firstName, lastName, email, password } = req.body;

    const pending = await this.authService.registerStudent({ firstName, lastName, email, password });

    createdSuccessResponse(res, "account created. A verification code has been sent to your email.", pending);
  };

  public verifyEmail = async (req: Request<{}, {}, VerifyEmailInput>, res: Response): Promise<void> => {
    const { email, otp } = req.body;

    const authUser: IAuthUser = await this.authService.verifyEmail(email, otp);

    successResponse(res, "email verified successfully.", authUser);
  };

  public resendVerification = async (req: Request<{}, {}, ResendVerificationInput>, res: Response): Promise<void> => {
    await this.authService.resendVerificationCode(req.body.email);

    // Same response whether or not the account exists or is already verified
    successResponse(res, "if this account is awaiting verification, a new code has been sent.", {});
  };

  public changePassword = async (req: Request<{}, {}, ChangePasswordInput>, res: Response): Promise<void> => {
    const { oldPassword, newPassword } = req.body;

    const id = req.user?.id as string;

    await this.authService.changePassword(id, oldPassword, newPassword);

    successResponse(res, "password changed successfully.", {});
  };

  public forgotPassword = async (req: Request<{}, {}, ForgotPasswordInput>, res: Response): Promise<void> => {
    const { email } = req.body;

    await this.authService.requestPasswordReset(email);

    successResponse(res, "password reset mail sent successfully.", {});
  }

  public resetPassword = async (req: Request<{}, {}, ResetPasswordInput>, res: Response): Promise<void> => {
    const { email, otp, newPassword } = req.body;

    await this.authService.resetPassword(email, otp, newPassword);

    successResponse(res, "password reset successfully.", {});
  }
}