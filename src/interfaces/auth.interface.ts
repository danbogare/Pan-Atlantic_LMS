import { IUser } from "../models/user.model";

export interface IAuthUserPayload {
  id: string;
  email: string;
  role: string;
}

export interface IAuthUser {
  user: IUser;
  accessToken: string;
}