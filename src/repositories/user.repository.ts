import { Model } from 'mongoose';
import { IUser, UserRole } from '../models/user.model';
import { IEnrollment, IInstructorAssignment } from '../models/course.model';
import { IInstructorWithCourses, IStudentWithCourses } from '../interfaces/user.interface';
import { IUserAuthState } from '../interfaces/auth.interface';

export interface IUserRepository {
  findById(id: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  findAuthStateById(id: string): Promise<IUserAuthState | null>;
  getAllInstructors(): Promise<IUser[]>;
  getAllStudents(): Promise<IUser[]>;
  getUsersByRole(role: UserRole): Promise<IUser[]>;
  create(userData: Partial<IUser>): Promise<IUser>;
  updateStreak(id: string, newStreak: number, lastActivityAt: Date): Promise<IUser | null>;
  updatePassword(id: string, newPasswordHash: string): Promise<void>;
  updateUserInfo(id: string, firstname: string, lastname: string): Promise<IUser | null>
  findProfileById(id: string): Promise<IUser | null>;
  markEmailVerified(id: string): Promise<IUser | null>;
  updatePendingRegistration(
    id: string,
    data: { firstName: string; lastName: string; passwordHash: string }
  ): Promise<IUser | null>;
  updateProfile(id: string, data: { firstName?: string; lastName?: string }): Promise<IUser | null>;
  changePassword(id: string, newPasswordHash: string): Promise<void>;
  getStudentByIdWithCourses(id: string): Promise<IStudentWithCourses | null>;
  getInstructorByIdWithCourses(id: string): Promise<IInstructorWithCourses | null>;
  findIdsByRole(role: UserRole): Promise<string[]>;
  findAllIds(): Promise<string[]>;
  deleteWithRelations(id: string): Promise<void>;
}

export class UserRepository implements IUserRepository {
  constructor(
    private readonly UserModel: Model<IUser>,
    private readonly EnrollmentModel: Model<IEnrollment>,
    private readonly InstructorAssignmentModel: Model<IInstructorAssignment>
  ) {}

  public async findById(id: string): Promise<IUser | null> {
    return await this.UserModel.findById(id).exec();
  }

  public async findByEmail(email: string): Promise<IUser | null> {
    // Emails are stored lowercased by the schema, so normalize lookups the same way
    return await this.UserModel.findOne({ email: email.trim().toLowerCase() }).exec();
  }

  // Lightweight lookup used on every authenticated request
  public async findAuthStateById(id: string): Promise<IUserAuthState | null> {
    return await this.UserModel
      .findById(id)
      .select('email role isActive mustChangePassword emailVerified')
      .lean<IUserAuthState>()
      .exec();
  }

  public async getAllInstructors(): Promise<IUser[]> {
    return await this.UserModel
      .find({ role: UserRole.INSTRUCTOR, isActive: true })
      .select('_id firstName lastName email isActive role mustChangePassword learningStreak lastActivityAt')
      .sort({ firstName: 1 })
      .exec();
  }

  public async getAllStudents(): Promise<IUser[]> {
    return await this.UserModel
      .find({ role: UserRole.STUDENT, isActive: true })
      .select('_id firstName lastName email isActive role mustChangePassword learningStreak lastActivityAt')
      .sort({ firstName: 1 })
      .exec();
  }

  public async getUsersByRole(role: UserRole): Promise<IUser[]> {
    return await this.UserModel
      .find({ role, isActive: true })
      .select('_id firstName lastName email isActive role mustChangePassword learningStreak lastActivityAt')
      .sort({ firstName: 1 })
      .exec();
  }

  public async create(userData: Partial<IUser>): Promise<IUser> {
    return await this.UserModel.create(userData);
  }

  public async updateStreak(id: string, newStreak: number, lastActivityAt: Date): Promise<IUser | null> {
    return await this.UserModel.findByIdAndUpdate(
      id,
      { $set: { learningStreak: newStreak, lastActivityAt } },
      { new: true }
    ).exec();
  }
  
  public async updateUserInfo(id: string, firstname: string, lastname: string): Promise<IUser | null> {
    return await this.UserModel.findByIdAndUpdate(
      id,
      { $set: { firstName: firstname, lastName: lastname } },
      { new: true }
    ).select('-passwordHash').exec();
  }

  public async markEmailVerified(id: string): Promise<IUser | null> {
    return await this.UserModel.findByIdAndUpdate(id, { $set: { emailVerified: true } }, { new: true }).exec();
  }

  // Replaces the details of a sign-up that was never verified (only the inbox owner can complete it)
  public async updatePendingRegistration(
    id: string,
    data: { firstName: string; lastName: string; passwordHash: string }
  ): Promise<IUser | null> {
    return await this.UserModel.findOneAndUpdate(
      { _id: id, emailVerified: false },
      { $set: data },
      { new: true, runValidators: true }
    ).exec();
  }

  public async findProfileById(id: string): Promise<IUser | null> {
    return await this.UserModel.findById(id).select('-passwordHash').exec();
  }

  public async updateProfile(id: string, data: { firstName?: string; lastName?: string }): Promise<IUser | null> {
    return await this.UserModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).select('-passwordHash').exec();
  }

  public async updatePassword(id: string, newPasswordHash: string): Promise<void> {
    await this.UserModel.findByIdAndUpdate(
      id,
      { $set: { passwordHash: newPasswordHash } }
    ).exec();
  }
  
  public async changePassword(id: string, newPasswordHash: string): Promise<void> {
    await this.UserModel.findByIdAndUpdate(
      id,
      { $set: { passwordHash: newPasswordHash, mustChangePassword: false } }
    ).exec();
  }

  public async getStudentByIdWithCourses(id: string): Promise<IStudentWithCourses | null> {
    const student = await this.UserModel.findById(id).select('-passwordHash').exec();
    if (!student) return null;

    const courses = await this.EnrollmentModel.find({ student: id }).populate('course').lean().exec();

    return { student, courses };
  }

  public async getInstructorByIdWithCourses(id: string): Promise<IInstructorWithCourses | null> {
    const instructor = await this.UserModel.findById(id).select('-passwordHash').exec();
    if (!instructor) return null;

    const courses = await this.InstructorAssignmentModel.find({ instructor: id }).populate('course').lean().exec();

    return { instructor, courses };
  }

  public async findIdsByRole(role: UserRole): Promise<string[]> {
    const users = await this.UserModel.find({ role }).select('_id').exec();
    return users.map((u) => u._id.toString());
  }

  public async findAllIds(): Promise<string[]> {
    const users = await this.UserModel.find().select('_id').exec();
    return users.map((u) => u._id.toString());
  }

  // Removes a user and anything linked to them; used to roll back a partially failed onboarding
  public async deleteWithRelations(id: string): Promise<void> {
    await Promise.all([
      this.EnrollmentModel.deleteMany({ student: id }).exec(),
      this.InstructorAssignmentModel.deleteMany({ instructor: id }).exec(),
    ]);
    await this.UserModel.findByIdAndDelete(id).exec();
  }
}
