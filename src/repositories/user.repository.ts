import { Model } from 'mongoose';
import { IUser } from '../models/user.model';

export interface IUserRepository {
  findById(id: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  create(userData: Partial<IUser>): Promise<IUser>;
  updateStreak(id: string, newStreak: number): Promise<IUser | null>;
}

export class UserRepository implements IUserRepository {
  constructor(private readonly model: Model<IUser>) {}

  public async findById(id: string): Promise<IUser | null> {
    return await this.model.findById(id).exec();
  }

  public async findByEmail(email: string): Promise<IUser | null> {
    return await this.model.findOne({ email }).exec();
  }

  public async create(userData: Partial<IUser>): Promise<IUser> {
    return await this.model.create(userData);
  }

  public async updateStreak(id: string, newStreak: number): Promise<IUser | null> {
    return await this.model.findByIdAndUpdate(
      id,
      { $set: { learningStreak: newStreak } },
      { new: true }
    ).exec();
  }
}