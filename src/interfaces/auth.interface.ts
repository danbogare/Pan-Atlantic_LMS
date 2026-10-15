import { IUser, UserRole } from "../models/user.model";

export interface IAuthUserPayload {
  id: string;
  email: string;
  role: UserRole;
}

export interface RegisterStudentPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface IAuthUser {
  user: IUser;
  accessToken: string;
}
export interface IUserAuthState {
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  emailVerified?: boolean;
}

export interface RegistrationPending {
  email: string;
  expiresInMinutes: number;
}
