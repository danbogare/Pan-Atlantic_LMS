import { Model } from 'mongoose';
import { User, IUser } from '../models/user.model';
import { IUserRepository } from '../interfaces/user-repository.interface';

export class UserRepository implements IUserRepository {
  private model: Model<IUser>;

  constructor() {
    // We bind the functional Mongoose model to our class instance
    this.model = User;
  }

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