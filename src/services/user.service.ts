import crypto from "crypto";
import bcrypt from "bcryptjs";
import { IUserRepository } from "../interfaces/user-repository.interface";
import { UserRole } from "../models/user.model";
import { IMailService } from "./mail.service";

export class UserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly mailService: IMailService
  ) {}

  public async inviteStudent(
    firstName: string,
    lastName: string,
    email: string
  ): Promise<void> {

    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new Error("Account already exists.");
    }

    const tempPassword = `LMS-${crypto.randomBytes(3).toString("hex")}`;

    const secureHash = await bcrypt.hash(tempPassword, 12);

    await this.userRepository.create({
      firstName,
      lastName,
      email,
      passwordHash: secureHash,
      role: UserRole.STUDENT,
      mustChangePassword: true
    });

    // 🔥 fire-and-forget (intentional non-blocking email)
    void this.mailService.sendStudentInviteEmail(
      email,
      firstName,
      tempPassword
    );

    console.log(
      "🚀 Student created. Email dispatched asynchronously."
    );
  }
}