import { z } from "zod";
import "../openapi/registry";

export const updateUserInfoSchema = z.object({
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
});

// Pro-tip: Export the TypeScript type inferred from the Zod schema
// This lets you use it in your controllers/services for strict typing!
export type UpdateUserInfoInput = z.infer<typeof updateUserInfoSchema>;

// Self-service profile update: at least one field, same rules as the admin update
export const updateProfileSchema = updateUserInfoSchema
  .partial()
  .refine((data) => data.firstName !== undefined || data.lastName !== undefined, {
    error: "Provide firstName and/or lastName to update",
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
