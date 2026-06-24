import crypto from "crypto";
import bcrypt from "bcryptjs";
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
  OTPExpiredError 
} from "../errors/error"; // Adjust path to your errors file

export interface IAuthService {
  authUser(email: string, password: string): Promise<IUser>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(email: string, code: string, newPassword: string): Promise<void>;
}

export class AuthService implements IAuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly otpRepository: IOtpRepository,
    private readonly mailService: IMailService
  ) {}

  /**
   * Authenticates a user. 
   * Now throws errors directly so your controller doesn't have to do any checking.
   */
  public async authUser(email: string, password: string): Promise<IUser> {
    const user = await this.userRepository.findByEmail(email);
    
    // 💥 Rule 1: Throw credential error directly if user doesn't exist
    if (!user) {
      throw new InvalidCredentialError();
    }

    // 💡 Added Security Check: Block deactivated users from logging in!
    if (!user.isActive) {
      throw new AccountDisabledError();
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new InvalidCredentialError();
    }

    // Strip passwordHash before returning
    const userObj = user.toObject();
    delete (userObj as any).passwordHash;

    return userObj as unknown as IUser;
  }

  /**
   * Requests a password reset and sends a secure OTP
   */
  public async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    // Keep the security best practice: quiet return to prevent user sniffing
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    // 💥 Rule 2: Throws your custom OTPExistsError if they are spamming requests
    const latestOtp = await this.otpRepository.findLatest(user.id, OtpPurpose.PASSWORD_RESET);
    if (latestOtp) {
      throw new OTPExistsError();
    }

    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(rawOtp, 10);

    await this.otpRepository.create({
      userId: user._id,
      code: hashedOtp,
      purpose: OtpPurpose.PASSWORD_RESET,
    });

    void this.mailService.sendPasswordResetEmail(email, user.firstName, rawOtp);
    console.log(`Password reset OTP generated and dispatched for userId: ${user.id}`);
  }

  /**
   * Validates the OTP and updates the password
   */
  public async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UserNotFoundError();
    }

    const latestOtp = await this.otpRepository.findLatest(user.id, OtpPurpose.PASSWORD_RESET);
    if (!latestOtp) {
      throw new InvalidRequestError(); // No OTP was ever generated for them
    }

    // 💥 Rule 3: Throws specific OTPExpiredError so frontend knows to show a "Resend" button
    const isExpired = Date.now() - latestOtp.createdAt.getTime() > 300000;
    if (isExpired) {
      throw new OTPExpiredError();
    }

    // 💥 Rule 4: Throw credential error for typing a bad code
    const isCodeValid = await bcrypt.compare(code, latestOtp.code);
    if (!isCodeValid) {
      throw new InvalidCredentialError(); 
    }

    // Clear the OTP token immediately after successful match
    await this.otpRepository.deleteMany(user.id, OtpPurpose.PASSWORD_RESET);

    // Update password
    const secureHash = await bcrypt.hash(newPassword, 12);
    await this.userRepository.updatePassword(user.id, secureHash);

    console.log(`Password successfully reset for userId: ${user.id}`);
  }
}