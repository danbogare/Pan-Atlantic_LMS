import bcrypt from "bcryptjs";
import { IUserRepository } from "../repositories/user.repository";
import { UserRole } from "../models/user.model";
import { IAdminSeedConfig } from "../config/env";

export async function seedAdmin(
  userRepository: IUserRepository,
  config: IAdminSeedConfig
): Promise<void> {
  const existingAdmin = await userRepository.findByEmail(config.email);

  if (existingAdmin) {
    return;
  }

  const passwordHash = await bcrypt.hash(config.password, 12);

  await userRepository.create({
    firstName: config.firstName,
    lastName: config.lastName,
    email: config.email,
    passwordHash,
    role: UserRole.ADMIN,
    mustChangePassword: false,
  });

  console.log("Default admin account created.");
}