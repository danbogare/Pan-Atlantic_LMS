import { IUserRepository } from "../repositories/user.repository";
import { ICourseRepository } from "../repositories/course.repository";
import { IUser, UserRole } from "../models/user.model";
import { IMailService } from "./mail.service";
import {
  UserExistsError,
  CourseNotFoundError,
  UserNotFoundError,
  AlreadyEnrolledError,
  BadRequestError,
  CourseTypeNotAllowedError,
} from "../errors/error";
import { ICryptoService } from "./crypto.service";
import { Types } from "mongoose";
import { CourseType, ICourse } from "../models/course.model";
import { computeAccessWindow } from "../utils/course-access";
import { withCurrentStreak } from "../utils/streak";
import {
  InviteInstructorPayload,
  EnrollStudentPayload,
  IStudentWithCourses,
  IInstructorWithCourses,
  StudentEnrollmentResult,
} from "../interfaces/user.interface";

export interface IUserService {
  // Student methods
  // Academic courses only. Creates and emails a new student, or just enrolls an existing one (no email).
  inviteStudent(data: EnrollStudentPayload, enrolledBy: string): Promise<StudentEnrollmentResult>;
  
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

  public async inviteStudent(data: EnrollStudentPayload, enrolledBy: string): Promise<StudentEnrollmentResult> {
    const { firstName, lastName, email } = data;
    const courseIds = this.uniqueIds(data.courseIds);

    // If courses specified, validate they exist and are academic
    const courses = courseIds.length > 0 ? await this.validateCourses(courseIds) : [];
    this.ensureAcademicCourses(courses);

    // Existing student (e.g. self-registered, paid and verified by an admin): just enroll, no new account or email
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      if (existingUser.role !== UserRole.STUDENT) {
        throw new BadRequestError("This email belongs to an account that is not a student");
      }
      return await this.enrollExistingStudent(existingUser.id, courses, enrolledBy);
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
    if (courses.length > 0) {
      await this.rollbackOnFailure(user.id, () =>
        this.enrollStudentInCourses(user.id, courses, enrolledBy)
      );
    }

    // Send email in the background; a failure is logged by MailService and must not crash the process.
    // The student can still get in through the forgot-password flow.
    this.mailService.sendStudentInviteEmail(email, firstName, tempPassword).catch(() => undefined);
    console.log(`Student ${email} created${courseIds.length > 0 ? ' and enrolled in courses' : ''}`);

    return {
      studentId: user.id,
      isNewAccount: true,
      enrolledCourseIds: courses.map((course) => course._id.toString()),
      alreadyEnrolledCourseIds: [],
    };
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
    return (await this.userRepository.getAllStudents()).map(withCurrentStreak);
  }
  
  public async getUsersByRole(role: UserRole): Promise<IUser[]> {
    return (await this.userRepository.getUsersByRole(role)).map(withCurrentStreak);
  }

  public async getStudentByIdWithCourses(id: string): Promise<IStudentWithCourses | null> {
    const result = await this.userRepository.getStudentByIdWithCourses(id);
    if (result) withCurrentStreak(result.student);
    return result;
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
    // The stored streak only changes on activity, so a lapsed one would otherwise still show its old value
    return withCurrentStreak(user);
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

  private ensureAcademicCourses(courses: ICourse[]): void {
    const notAcademic = courses.filter((course) => course.courseType !== CourseType.ACADEMIC);
    if (notAcademic.length > 0) {
      const titles = notAcademic.map((course) => course.title).join(", ");
      throw new CourseTypeNotAllowedError(
        `Admins can only enroll students in academic courses; professional courses are applied for by the student: ${titles}`
      );
    }
  }

  // Enrolls an existing student in the courses they aren't in yet. Never rolls back: the account predates this request.
  private async enrollExistingStudent(
    studentId: string,
    courses: ICourse[],
    enrolledBy: string,
  ): Promise<StudentEnrollmentResult> {
    const toEnroll: ICourse[] = [];
    const alreadyEnrolledCourseIds: string[] = [];
    for (const course of courses) {
      const courseId = course._id.toString();
      if (await this.courseRepository.findEnrollment(studentId, courseId)) {
        alreadyEnrolledCourseIds.push(courseId);
      } else {
        toEnroll.push(course);
      }
    }

    if (courses.length > 0 && toEnroll.length === 0) {
      throw new AlreadyEnrolledError();
    }

    await this.enrollStudentInCourses(studentId, toEnroll, enrolledBy);
    console.log(`Existing student ${studentId} enrolled in ${toEnroll.length} course(s)`);

    return {
      studentId,
      isNewAccount: false,
      enrolledCourseIds: toEnroll.map((course) => course._id.toString()),
      alreadyEnrolledCourseIds,
    };
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