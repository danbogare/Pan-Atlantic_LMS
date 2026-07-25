import { z } from "zod";

export const inviteInstructorSchema = z.object({
  firstName: z
    .string({ message: "First name is required" })
    .trim()
    .min(1, { message: "First name cannot be empty" })
    .openapi({ example: "John" }),
    
  lastName: z
    .string({ message: "Last name is required" })
    .trim()
    .min(1, { message: "Last name cannot be empty" })
    .openapi({ example: "Doe" }),
    
  email: z
    .string({ message: "Email is required" })
    .trim()
    .pipe(z.email({ message: "Invalid email address format" }))
    .openapi({ example: "jane@example.com" }),
    
  assignedCourseIds: z
    .array(z.string())
    .optional()
    .default([])
    .openapi({ example: ["course-1", "course-2"] }),
});

export type InviteInstructorInput = z.infer<typeof inviteInstructorSchema>;