import { IUser, UserRole } from "../models/user.model";

export interface IAuthUserPayload {
  id: string;
  email: string;
  role: UserRole;
}

export interface IAuthUser {
  user: IUser;
  accessToken: string;
}