import { IUserRepository } from "../repositories/user.repository";
import { ICourseRepository } from "../repositories/course.repository";
import { IUser, UserRole } from "../models/user.model";
import { IMailService } from "./mail.service";
import { UserExistsError, CourseNotFoundError } from "../errors/error";
import { ICryptoService } from "./crypto.service";
import { Types } from "mongoose";
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
}

export class UserService implements IUserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly courseRepository: ICourseRepository, // Added
    private readonly mailService: IMailService,
    private readonly cryptoService: ICryptoService
  ) {}

  public async inviteStudent(data: EnrollStudentPayload, enrolledBy: string): Promise<void> {
    const { firstName, lastName, email, courseIds } = data;

    // Check if user exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new UserExistsError();
    }

    // If courses specified, validate they exist
    if (courseIds && courseIds.length > 0) {
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
      role: UserRole.STUDENT,
      mustChangePassword: true
    });

    // Enroll in courses if specified
    if (courseIds && courseIds.length > 0) {
      await this.enrollStudentInCourses(user._id.toString(), courseIds, enrolledBy);
    }

    // Send email
    void this.mailService.sendStudentInviteEmail(email, firstName, tempPassword);
    console.log(`Student ${email} created${courseIds ? ' and enrolled in courses' : ''}`);
  }

  public async inviteInstructor(data: InviteInstructorPayload, assignedBy: string): Promise<void> {
    const { firstName, lastName, email, courseIds } = data;

    // Check if user exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new UserExistsError();
    }

    // If courses specified, validate they exist
    if (courseIds && courseIds.length > 0) {
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
    if (courseIds && courseIds.length > 0) {
      await this.assignInstructorToCourses(user._id.toString(), courseIds, assignedBy);
    }

    // Send email
    void this.mailService.sendInstructorInviteEmail(email, firstName, tempPassword);
    console.log(`Instructor ${email} created${courseIds ? ' and assigned to courses' : ''}`);
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

  // Private helper methods
  private async validateCourses(courseIds: string[]): Promise<void> {
    for (const courseId of courseIds) {
      const course = await this.courseRepository.findById(courseId);
      if (!course) {
        throw new CourseNotFoundError(`Course ${courseId} not found`);
      }
    }
  }

  private async enrollStudentInCourses(
    studentId: string, 
    courseIds: string[],
    enrolledBy: string,
  ): Promise<void> {
    for (const courseId of courseIds) {
      await this.courseRepository.enrollStudent({
        student: new Types.ObjectId(studentId),
        course: new Types.ObjectId(courseId),
        enrolledBy: new Types.ObjectId(enrolledBy) // Or pass admin ID
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