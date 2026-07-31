import { Model } from 'mongoose';
import { IUser, UserRole } from '../models/user.model';
import { IEnrollment, IInstructorAssignment } from '../models/course.model';
import { IInstructorWithCourses, IStudentWithCourses } from '../interfaces/user.interface';

export interface IUserRepository {
  findById(id: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  getAllInstructors(): Promise<IUser[]>;
  getAllStudents(): Promise<IUser[]>;
  getUsersByRole(role: UserRole): Promise<IUser[]>;
  create(userData: Partial<IUser>): Promise<IUser>;
  updateStreak(id: string, newStreak: number): Promise<IUser | null>;
  updatePassword(id: string, newPasswordHash: string): Promise<void>;
  changePassword(id: string, newPasswordHash: string): Promise<void>;
  getStudentByIdWithCourses(id: string): Promise<IStudentWithCourses | null>;
  getInstructorByIdWithCourses(id: string): Promise<IInstructorWithCourses | null>;
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
    return await this.UserModel.findOne({ email }).exec();
  }

  public async getAllInstructors(): Promise<IUser[]> {
    return await this.UserModel
      .find({ role: UserRole.INSTRUCTOR, isActive: true })
      .select('_id firstName lastName email isActive role mustChangePassword learningStreak')
      .sort({ firstName: 1 })
      .exec();
  }

  public async getAllStudents(): Promise<IUser[]> {
    return await this.UserModel
      .find({ role: UserRole.STUDENT, isActive: true })
      .select('_id firstName lastName email isActive role mustChangePassword learningStreak')
      .sort({ firstName: 1 })
      .exec();
  }

  public async getUsersByRole(role: UserRole): Promise<IUser[]> {
    return await this.UserModel
      .find({ role, isActive: true })
      .select('_id firstName lastName email isActive role mustChangePassword learningStreak')
      .sort({ firstName: 1 })
      .exec();
  }

  public async create(userData: Partial<IUser>): Promise<IUser> {
    return await this.UserModel.create(userData);
  }

  public async updateStreak(id: string, newStreak: number): Promise<IUser | null> {
    return await this.UserModel.findByIdAndUpdate(
      id,
      { $set: { learningStreak: newStreak } },
      { new: true }
    ).exec();
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
    const student = await this.UserModel.findById(id).exec();
    if (!student) return null;
    student?.deleteOne({ passwordHash: 1 }); // Remove passwordHash from response

    const courses = await this.EnrollmentModel.find({ student: id }).populate('course').lean().exec();

    return { student, courses };
  }

  public async getInstructorByIdWithCourses(id: string): Promise<IInstructorWithCourses | null> {
    const instructor = await this.UserModel.findById(id).exec();
    if (!instructor) return null;
    instructor?.deleteOne({ passwordHash: 1 }); // Remove passwordHash from response

    const courses = await this.InstructorAssignmentModel.find({ instructor: id }).populate('course').lean().exec();

    return { instructor, courses };
  }
}