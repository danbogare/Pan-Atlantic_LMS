import { IUserRepository } from "../repositories/user.repository";
import { ICourseRepository } from "../repositories/course.repository";
import { IUser, UserRole } from "../models/user.model";
import { IMailService } from "./mail.service";
import { UserExistsError, CourseNotFoundError, UserNotFoundError } from "../errors/error";
import { ICryptoService } from "./crypto.service";
import { Types } from "mongoose";
import { ICourse } from "../models/course.model";
import { computeAccessWindow } from "../utils/course-access";
import { InviteInstructorPayload, EnrollStudentPayload, IStudentWithCourses, IInstructorWithCourses } from "../interfaces/user.interface";

export interface IUserService {
  // Student methods
  inviteStudent(data: EnrollStudentPayload, enrolledBy: string): Promise<void>;
  
  // Instructor methods
  inviteInstructor(data: InviteInstructorPayload, assignedBy: string): Promise<void>;
  
  // Common methods
  getAllInstructors(): Promise<any[]>;
  getAllStudents(): Promise<any[]>;
  getUsersByRole(role: UserRole): Promise<IUser[]>;
  getStudentByIdWithCourses(id: string): Promise<IStudentWithCourses | null>;
  getInstructorByIdWithCourses(id: string): Promise<IInstructorWithCourses | null>;

  updateUserInfo(id: string, firstName: string, lastName: string): Promise<IUser | null>;

  // Self-service profile (any logged-in user)
  getProfile(id: string): Promise<IUser>;
  updateProfile(id: string, data: { firstName?: string; lastName?: string }): Promise<IUser>;
}

export class UserService implements IUserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly courseRepository: ICourseRepository, // Added
    private readonly mailService: IMailService,
    private readonly cryptoService: ICryptoService
  ) {}

  public async inviteStudent(data: EnrollStudentPayload, enrolledBy: string): Promise<void> {
    const { firstName, lastName, email } = data;
    const courseIds = this.uniqueIds(data.courseIds);

    // Check if user exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new UserExistsError();
    }

    // If courses specified, validate they exist
    const courses = courseIds.length > 0 ? await this.validateCourses(courseIds) : [];

    // Create user
    const tempPassword = this.cryptoService.generateTempPass();
    const secureHash = await this.cryptoService.hashPassword(tempPassword);

    const user = await this.userRepository.create({
      firstName,
      lastName,
      email,
      passwordHash: secureHash,
      role: UserRole.STUDENT,
      mustChangePassword: true
    });

    // Enroll in courses if specified
    if (courses.length > 0) {
      await this.rollbackOnFailure(user.id, () =>
        this.enrollStudentInCourses(user.id, courses, enrolledBy)
      );
    }

    // Send email in the background; a failure is logged by MailService and must not crash the process.
    // The student can still get in through the forgot-password flow.
    this.mailService.sendStudentInviteEmail(email, firstName, tempPassword).catch(() => undefined);
    console.log(`Student ${email} created${courseIds.length > 0 ? ' and enrolled in courses' : ''}`);
  }

  public async inviteInstructor(data: InviteInstructorPayload, assignedBy: string): Promise<void> {
    const { firstName, lastName, email } = data;
    const courseIds = this.uniqueIds(data.courseIds);

    // Check if user exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new UserExistsError();
    }

    // If courses specified, validate they exist
    if (courseIds.length > 0) {
      await this.validateCourses(courseIds);
    }

    // Create user
    const tempPassword = this.cryptoService.generateTempPass();
    const secureHash = await this.cryptoService.hashPassword(tempPassword);

    const user = await this.userRepository.create({
      firstName,
      lastName,
      email,
      passwordHash: secureHash,
      role: UserRole.INSTRUCTOR,
      mustChangePassword: true
    });

    // Assign to courses if specified
    if (courseIds.length > 0) {
      await this.rollbackOnFailure(user.id, () =>
        this.assignInstructorToCourses(user.id, courseIds, assignedBy)
      );
    }

    // Send email in the background; a failure is logged by MailService and must not crash the process
    this.mailService.sendInstructorInviteEmail(email, firstName, tempPassword).catch(() => undefined);
    console.log(`Instructor ${email} created${courseIds.length > 0 ? ' and assigned to courses' : ''}`);
  }

  public async getAllInstructors(): Promise<IUser[]> {
    return await this.userRepository.getAllInstructors();
  }

  public async getAllStudents(): Promise<IUser[]> {
    return await this.userRepository.getAllStudents();
  }
  
  public async getUsersByRole(role: UserRole): Promise<IUser[]> {
    return await this.userRepository.getUsersByRole(role);
  }

  public async getStudentByIdWithCourses(id: string): Promise<IStudentWithCourses | null> {
    return await this.userRepository.getStudentByIdWithCourses(id);
  }

  public async getInstructorByIdWithCourses(id: string): Promise<IInstructorWithCourses | null> {
    return await this.userRepository.getInstructorByIdWithCourses(id);
  }

  public async updateUserInfo(id: string, firstName: string, lastName: string): Promise<IUser | null> {
    return await this.userRepository.updateUserInfo(id, firstName, lastName);
  }

  public async getProfile(id: string): Promise<IUser> {
    const user = await this.userRepository.findProfileById(id);
    if (!user) throw new UserNotFoundError();
    return user;
  }

  public async updateProfile(id: string, data: { firstName?: string; lastName?: string }): Promise<IUser> {
    // Only names are self-editable; email/role/status changes stay with admins
    const update: { firstName?: string; lastName?: string } = {};
    if (data.firstName !== undefined) update.firstName = data.firstName;
    if (data.lastName !== undefined) update.lastName = data.lastName;

    const user = await this.userRepository.updateProfile(id, update);
    if (!user) throw new UserNotFoundError();
    return user;
  }

  // Private helper methods
  private uniqueIds(ids?: string[]): string[] {
    return [...new Set(ids ?? [])];
  }

  // Deletes a just-created user if a follow-up step fails, so onboarding is all-or-nothing
  // (Mongo transactions would need a replica set, which local/standalone setups don't have).
  private async rollbackOnFailure(userId: string, step: () => Promise<void>): Promise<void> {
    try {
      await step();
    } catch (error) {
      await this.userRepository.deleteWithRelations(userId).catch((cleanupError) => {
        console.error(`Failed to roll back user ${userId}:`, cleanupError);
      });
      throw error;
    }
  }

  private async validateCourses(courseIds: string[]): Promise<ICourse[]> {
    const courses: ICourse[] = [];
    for (const courseId of courseIds) {
      if (!Types.ObjectId.isValid(courseId)) {
        throw new CourseNotFoundError(`Course ${courseId} not found`);
      }
      const course = await this.courseRepository.findById(courseId);
      if (!course) {
        throw new CourseNotFoundError(`Course ${courseId} not found`);
      }
      courses.push(course);
    }
    return courses;
  }

  private async enrollStudentInCourses(
    studentId: string, 
    courses: ICourse[],
    enrolledBy: string,
  ): Promise<void> {
    for (const course of courses) {
      await this.courseRepository.enrollStudent({
        student: new Types.ObjectId(studentId),
        course: course._id as Types.ObjectId,
        enrolledBy: new Types.ObjectId(enrolledBy),
        // Access clock starts the day after enrollment (Africa/Lagos)
        ...computeAccessWindow(course.duration ?? 0),
      });
    }
  }

  private async assignInstructorToCourses(
    instructorId: string, 
    courseIds: string[],
    assignedBy: string,
  ): Promise<void> {
    for (const courseId of courseIds) {
      await this.courseRepository.assignInstructor({
        instructor: new Types.ObjectId(instructorId),
        course: new Types.ObjectId(courseId),
        assignedBy: new Types.ObjectId(assignedBy), // Or pass admin ID
      });
    }
  }
}