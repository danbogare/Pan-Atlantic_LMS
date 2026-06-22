import { IUser } from '../models/user.model';

export interface IUserRepository {
  findById(id: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  create(userData: Partial<IUser>): Promise<IUser>;
  updateStreak(id: string, newStreak: number): Promise<IUser | null>;
}