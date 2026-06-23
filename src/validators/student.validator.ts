import { z } from "zod";

export const enrollStudentSchema = z.object({
  firstName: z
    .string({ error: "First name is required" })
    .trim()
    .min(1, { error: "First name cannot be empty" }),
    
  lastName: z
    .string({ error: "Last name is required" })
    .trim()
    .min(1, { error: "Last name cannot be empty" }),
    
  // Use .pipe() to bridge string manipulation into Zod 4's top-level z.email()
  email: z
    .string({ error: "Email is required" })
    .trim()
    .pipe(z.email({ error: "Invalid email address format" })),
});

// Pro-tip: Export the TypeScript type inferred from the Zod schema
// This lets you use it in your controllers/services for strict typing!
export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;