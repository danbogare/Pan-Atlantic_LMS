import { z } from "zod";

export const inviteExternalAssessorSchema = z.object({
  firstName: z
    .string({ message: "First name is required" })
    .trim()
    .min(1, { message: "First name cannot be empty" })
    .openapi({ example: "Ada" }),

  lastName: z
    .string({ message: "Last name is required" })
    .trim()
    .min(1, { message: "Last name cannot be empty" })
    .openapi({ example: "Obi" }),

  email: z
    .string({ message: "Email is required" })
    .trim()
    .pipe(z.email({ message: "Invalid email address format" }))
    .openapi({ example: "assessor@example.com" }),
});

export type InviteExternalAssessorInput = z.infer<typeof inviteExternalAssessorSchema>;
