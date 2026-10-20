import { IUser } from "../models/user.model";

export interface EnrollStudentPayload {
  firstName: string;
  lastName: string;
  email: string;
  courseIds: string[];
}

export interface StudentEnrollmentResult {
  studentId: string;
  // false when the email already belonged to a student (e.g. self-registered); no invite email is sent then
  isNewAccount: boolean;
  enrolledCourseIds: string[];
  // Courses the student was already enrolled in, skipped
  alreadyEnrolledCourseIds: string[];
}

export interface InviteInstructorPayload {
  firstName: string;
  lastName: string;
  email: string;
  courseIds?: string[]; // Optionally assign to courses immediately
}

export interface IStudentWithCourses {
  student : IUser;
  courses: any[];
}

export interface IInstructorWithCourses {
  instructor : IUser;
  courses: any[];
}

export interface UpdateUserInviteInfo {
  firstName: string;
  lastName: string;
}