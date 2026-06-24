import { z } from "zod";

// export const registerSchema = z.object({
//   name: z
//     .string({ error: "Name is required" })
//     .trim()
//     .min(2, {error: "Name must be at least 2 characters"}),
//   email: z
//     .string({ error: "Email is required" })
//     .trim()
//     .pipe(z.email({ error: "Invalid email address format" })),
//   password: z
//     .string({ error: "Password is required" })
//     .min(8, {error: "Password must be at least 8 characters long"})
//     .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
//     .regex(/[a-z]/, "Password must contain at least one lowercase letter")
//     .regex(/[0-9]/, "Password must contain at least one number")
//     .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
// });

export const loginSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .pipe(z.email({ error: "Invalid email address format" })),
  password: z
    .string({ error: "Password is required" })
    .min(1, { error: "Password cannot be empty" }),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .pipe(z.email({ error: "Invalid email address format" })),
});

export const resetPasswordSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .pipe(z.email({ error: "Invalid email address format" })),
  otp: z
    .string({ error: "OTP is required" })
    .trim()
    .regex(/^\d+$/, { message: "OTP must contain numbers only" })
    .length(6, { message: "OTP must be exactly 6 digits" }),
  newPassword: z
    .string({ error: "Password is required" })
    .min(1, { error: "Password cannot be empty" }),
});

export const changePasswordSchema = z.object({
  oldPassword: z
    .string({ error: "Password is required" })
    .min(1, { error: "Password cannot be empty" }),
  newPassword: z
    .string({ error: "Password is required" })
    .min(1, { error: "Password cannot be empty" }),
});

// export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;