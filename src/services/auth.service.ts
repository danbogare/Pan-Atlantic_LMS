import { IUserRepository } from "../repositories/user.repository";
import { IOtpRepository } from "../repositories/otp.repository";
import { IMailService } from "./mail.service";
import { IUser } from "../models/user.model";
import { OtpPurpose } from "../models/otp.model";
import { 
  InvalidCredentialError, 
  AccountDisabledError, 
  OTPExistsError, 
  UserNotFoundError, 
  InvalidRequestError,
  OTPExpiredError, 
  InvalidOTPError
} from "../errors/error"; // Adjust path to your errors file
import { ICryptoService } from "./crypto.service";

export interface IAuthService {
  authUser(email: string, password: string): Promise<IUser>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(email: string, code: string, newPassword: string): Promise<void>;
  changePassword(id: string, oldPassword: string, newPassword: string): Promise<void>;
}

export class AuthService implements IAuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly otpRepository: IOtpRepository,
    private readonly mailService: IMailService,
    private readonly cryptoService: ICryptoService
  ) {}

  public async authUser(email: string, password: string): Promise<IUser> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialError();
    }

    // Added Security Check: Block deactivated users from logging in!
    if (!user.isActive) {
      throw new AccountDisabledError();
    }

    const isPasswordValid = await this.cryptoService.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new InvalidCredentialError();
    }

    // Strip passwordHash before returning
    const userObj = user.toObject();
    delete (userObj as any).passwordHash;

    return userObj as unknown as IUser;
  }

  public async changePassword(id: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError();
    }

    const isPasswordValid = await this.cryptoService.comparePassword(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new InvalidCredentialError();
    }

    const secureHash = await this.cryptoService.hashPassword(newPassword);
    await this.userRepository.changePassword(id, secureHash);

    console.log(`Password changed for userId: ${id}`);
  }
  
  public async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    // Keep the security best practice: quiet return to prevent user sniffing
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    const latestOtp = await this.otpRepository.findLatest(user.id, OtpPurpose.PASSWORD_RESET);
    if (latestOtp) {
      throw new OTPExistsError();
    }

    const rawOtp = this.cryptoService.generateOTP();
    const hashedOtp = await this.cryptoService.hashPassword(rawOtp);

    await this.otpRepository.create({
      userId: user._id,
      code: hashedOtp,
      purpose: OtpPurpose.PASSWORD_RESET,
    });

    void this.mailService.sendPasswordResetEmail(email, user.firstName, rawOtp);
    console.log(`Password reset OTP generated and dispatched for userId: ${user.id}`);
  }

  public async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UserNotFoundError();
    }

    const latestOtp = await this.otpRepository.findLatest(user.id, OtpPurpose.PASSWORD_RESET);
    if (!latestOtp) {
      throw new InvalidRequestError(); // No OTP was ever generated for them
    }

    // Throws specific OTPExpiredError so frontend knows to show a "Resend" button
    const isExpired = Date.now() - latestOtp.createdAt.getTime() > 300000;
    if (isExpired) {
      throw new OTPExpiredError();
    }

    // Throw credential error for typing a bad code
    const isCodeValid = await this.cryptoService.comparePassword(code, latestOtp.code);
    if (!isCodeValid) {
      throw new InvalidOTPError(); 
    }

    // Clear the OTP token immediately after successful match
    await this.otpRepository.deleteMany(user.id, OtpPurpose.PASSWORD_RESET);

    // Update password
    const secureHash = await this.cryptoService.hashPassword(newPassword);
    await this.userRepository.updatePassword(user.id, secureHash);

    console.log(`Password successfully reset for userId: ${user.id}`);
  }
}