import { IUserRepository } from "../repositories/user.repository";
import { withCurrentStreak } from "../utils/streak";
import { IOtpRepository } from "../repositories/otp.repository";
import { IMailService } from "./mail.service";
import { IUser, UserRole } from "../models/user.model";
import { OTP_TTL_SECONDS, OtpPurpose } from "../models/otp.model";
import { 
  InvalidCredentialError, 
  AccountDisabledError, 
  OTPExistsError, 
  UserNotFoundError, 
  InvalidRequestError,
  OTPExpiredError, 
  InvalidOTPError,
  UserExistsError,
  EmailNotVerifiedError,
  TooManyRequestsError,
  BadRequestError
} from "../errors/error"; // Adjust path to your errors file
import { ICryptoService } from "./crypto.service";
import { IAuthUser, IAuthUserPayload, RegisterStudentPayload, RegistrationPending } from "../interfaces/auth.interface";

const OTP_TTL_MS = OTP_TTL_SECONDS * 1000;
// Minimum gap between verification codes sent to the same account
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;

export interface IAuthService {
  authUser(email: string, password: string): Promise<IAuthUser>;
  registerStudent(data: RegisterStudentPayload): Promise<RegistrationPending>;
  verifyEmail(email: string, code: string): Promise<IAuthUser>;
  resendVerificationCode(email: string): Promise<void>;
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

  public async authUser(email: string, password: string): Promise<IAuthUser> {
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

    // Checked after the password so this can't be used to discover which emails are registered
    if (user.emailVerified === false) {
      throw new EmailNotVerifiedError();
    }

    return this.buildAuthData(user);
  }

  // Public sign-up: creates an unverified student and emails a verification code. No token is issued
  // until the email is verified.
  public async registerStudent(data: RegisterStudentPayload): Promise<RegistrationPending> {
    const passwordHash = await this.cryptoService.hashPassword(data.password);
    const existingUser = await this.userRepository.findByEmail(data.email);

    let user: IUser | null;
    if (existingUser) {
      if (existingUser.emailVerified !== false) {
        throw new UserExistsError();
      }
      // A sign-up that was never verified (possibly by someone who doesn't own the address) is replaced;
      // only whoever can read the inbox can complete it
      await this.assertResendAllowed(existingUser);
      user = await this.userRepository.updatePendingRegistration(existingUser.id, {
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash,
      });
      if (!user) throw new UserExistsError(); // verified in the meantime
    } else {
      // A concurrent sign-up with the same email hits the unique index and is reported as 409
      user = await this.userRepository.create({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash,
        role: UserRole.STUDENT,
        mustChangePassword: false,
        emailVerified: false,
      });
    }

    await this.issueVerificationCode(user);
    console.log(`Student registration pending verification: userId ${user.id}`);

    return { email: user.email, expiresInMinutes: OTP_TTL_SECONDS / 60 };
  }

  public async verifyEmail(email: string, code: string): Promise<IAuthUser> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new InvalidOTPError();
    }
    if (user.emailVerified !== false) {
      throw new BadRequestError("Email is already verified. Please log in.");
    }

    const latestOtp = await this.otpRepository.findLatest(user.id, OtpPurpose.EMAIL_VERIFICATION);
    // Missing or old code: the frontend should offer "resend"
    if (!latestOtp || Date.now() - latestOtp.createdAt.getTime() > OTP_TTL_MS) {
      throw new OTPExpiredError();
    }

    const isCodeValid = await this.cryptoService.comparePassword(code, latestOtp.code);
    if (!isCodeValid) {
      throw new InvalidOTPError();
    }

    await this.otpRepository.deleteMany(user.id, OtpPurpose.EMAIL_VERIFICATION);
    const verifiedUser = await this.userRepository.markEmailVerified(user.id);
    if (!verifiedUser) {
      throw new UserNotFoundError();
    }

    // Send in the background; MailService logs failures and they must not fail verification
    this.mailService.sendStudentWelcomeEmail(verifiedUser.email, verifiedUser.firstName).catch(() => undefined);
    console.log(`Email verified for userId: ${verifiedUser.id}`);

    return this.buildAuthData(verifiedUser);
  }

  public async resendVerificationCode(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    // Quiet return for unknown or already-verified emails to avoid revealing account state
    if (!user || user.emailVerified !== false) {
      return;
    }

    await this.assertResendAllowed(user);
    await this.issueVerificationCode(user);
  }

  private async assertResendAllowed(user: IUser): Promise<void> {
    const latestOtp = await this.otpRepository.findLatest(user.id, OtpPurpose.EMAIL_VERIFICATION);
    if (latestOtp && Date.now() - latestOtp.createdAt.getTime() < VERIFICATION_RESEND_COOLDOWN_MS) {
      throw new TooManyRequestsError("A verification code was just sent. Please wait a minute before requesting another.");
    }
  }

  // Replaces any previous code so only the newest one works
  private async issueVerificationCode(user: IUser): Promise<void> {
    await this.otpRepository.deleteMany(user.id, OtpPurpose.EMAIL_VERIFICATION);

    const rawOtp = this.cryptoService.generateOTP();
    const hashedOtp = await this.cryptoService.hashPassword(rawOtp);

    await this.otpRepository.create({
      userId: user._id as IUser["_id"],
      code: hashedOtp,
      purpose: OtpPurpose.EMAIL_VERIFICATION,
    });

    // Send in the background; if it fails, drop the code so the user can request a new one immediately
    this.mailService
      .sendEmailVerificationEmail(user.email, user.firstName, rawOtp, OTP_TTL_SECONDS / 60)
      .catch(async () => {
        await this.otpRepository.deleteMany(user.id, OtpPurpose.EMAIL_VERIFICATION).catch((error) => {
          console.error(`Failed to clear unsent verification code for userId: ${user.id}:`, error);
        });
      });
  }

  // Strips passwordHash and issues an access token
  private buildAuthData(user: IUser): IAuthUser {
    const userObj = withCurrentStreak(user.toObject());
    delete (userObj as any).passwordHash;

    const tokenData: IAuthUserPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      user: userObj as unknown as IUser,
      accessToken: this.cryptoService.generateToken(tokenData),
    };
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

    // Send in the background; MailService logs failures. If sending fails, drop the OTP so the
    // user can request a new code immediately instead of waiting for this one to expire.
    this.mailService.sendPasswordResetEmail(user.email, user.firstName, rawOtp).catch(async () => {
      await this.otpRepository.deleteMany(user.id, OtpPurpose.PASSWORD_RESET).catch((error) => {
        console.error(`Failed to clear unsent OTP for userId: ${user.id}:`, error);
      });
    });
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
    const isExpired = Date.now() - latestOtp.createdAt.getTime() > OTP_TTL_MS;
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

    // Completing a reset proves the user controls the inbox
    if (user.emailVerified === false) {
      await this.userRepository.markEmailVerified(user.id);
    }

    console.log(`Password successfully reset for userId: ${user.id}`);
  }
}