import { z } from "zod";
import "../openapi/registry";

export const enrollStudentSchema = z.object({
  firstName: z
    .string({ error: "First name is required" })
    .trim()
    .min(1, { error: "First name cannot be empty" })
    .openapi({ example: "John" }),
    
  lastName: z
    .string({ error: "Last name is required" })
    .trim()
    .min(1, { error: "Last name cannot be empty" })
    .openapi({ example: "Doe" }),
    
  // Use .pipe() to bridge string manipulation into Zod 4's top-level z.email()
  email: z
    .string({ error: "Email is required" })
    .trim()
    .pipe(z.email({ error: "Invalid email address format" }))
    .openapi({ example: "jane@example.com" }),
  
  assignedCourseIds: z
    .array(
      z.string().trim().min(1, { error: "Course ID cannot be empty" })
    )
    .min(1, { error: "At least one course must be assigned" })
    .openapi({ example: ["course-1", "course-2"] }),
});

// Pro-tip: Export the TypeScript type inferred from the Zod schema
// This lets you use it in your controllers/services for strict typing!
export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;