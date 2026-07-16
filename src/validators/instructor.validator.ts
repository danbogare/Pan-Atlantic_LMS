import { z } from "zod";

export const inviteInstructorSchema = z.object({
  firstName: z
    .string({ message: "First name is required" })
    .trim()
    .min(1, { message: "First name cannot be empty" }),
    
  lastName: z
    .string({ message: "Last name is required" })
    .trim()
    .min(1, { message: "Last name cannot be empty" }),
    
  email: z
    .string({ message: "Email is required" })
    .trim()
    .pipe(z.email({ message: "Invalid email address format" })),
    
  assignedCourseIds: z
    .array(z.string())
    .optional()
    .default([]),
});

export type InviteInstructorInput = z.infer<typeof inviteInstructorSchema>;