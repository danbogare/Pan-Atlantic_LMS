import { IUser } from "../models/user.model";

export interface EnrollStudentPayload {
  firstName: string;
  lastName: string;
  email: string;
  courseIds: string[];
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