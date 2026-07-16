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