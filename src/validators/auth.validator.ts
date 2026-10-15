import { z } from "zod";
import "../openapi/registry";

// Strength rules for any password a user chooses (login stays lenient so existing passwords keep working)
export const passwordSchema = z
  .string({ error: "Password is required" })
  .min(8, { error: "Password must be at least 8 characters long" })
  .max(128, { error: "Password must be at most 128 characters long" })
  .regex(/[A-Z]/, { error: "Password must contain at least one uppercase letter" })
  .regex(/[a-z]/, { error: "Password must contain at least one lowercase letter" })
  .regex(/[0-9]/, { error: "Password must contain at least one number" })
  .regex(/[^A-Za-z0-9]/, { error: "Password must contain at least one special character" });

const nameField = (label: string, example: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, { error: `${label} cannot be empty` })
    .max(50, { error: `${label} must be at most 50 characters` })
    .openapi({ example });

// Public student self-registration
export const registerSchema = z.object({
  firstName: nameField("First name", "Jane"),
  lastName: nameField("Last name", "Doe"),
  email: z
    .string({ error: "Email is required" })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Invalid email address format" }))
    .openapi({ example: "jane@example.com" }),
  password: passwordSchema.openapi({ example: "Hunter2-secure" }),
});

export const loginSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .pipe(z.email({ error: "Invalid email address format" }))
    .openapi({ example: "jane@example.com" }),
  password: z
    .string({ error: "Password is required" })
    .min(1, { error: "Password cannot be empty" })
    .openapi({ example: "hunter2" }),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .pipe(z.email({ error: "Invalid email address format" }))
    .openapi({ example: "jane@example.com" }),
});

export const resetPasswordSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .pipe(z.email({ error: "Invalid email address format" }))
    .openapi({ example: "jane@example.com" }),
  otp: z
    .string({ error: "OTP is required" })
    .trim()
    .regex(/^\d+$/, { message: "OTP must contain numbers only" })
    .length(6, { message: "OTP must be exactly 6 digits" })
    .openapi({ example: "482913", description: "6-digit one-time password sent to the user's email" }),
  newPassword: passwordSchema.openapi({ example: "NewHunter3!" }),
});

export const verifyEmailSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .pipe(z.email({ error: "Invalid email address format" }))
    .openapi({ example: "jane@example.com" }),
  otp: z
    .string({ error: "Verification code is required" })
    .trim()
    .regex(/^\d+$/, { message: "Verification code must contain numbers only" })
    .length(6, { message: "Verification code must be exactly 6 digits" })
    .openapi({ example: "482913", description: "6-digit code emailed after sign-up" }),
});

export const resendVerificationSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .pipe(z.email({ error: "Invalid email address format" }))
    .openapi({ example: "jane@example.com" }),
});

export const changePasswordSchema = z.object({
  oldPassword: z
    .string({ error: "Password is required" })
    .min(1, { error: "Password cannot be empty" })
    .openapi({ example: "hunter2" }),
  newPassword: passwordSchema.openapi({ example: "NewHunter3!" }),
}).refine((data) => data.newPassword !== data.oldPassword, {
  error: "New password must be different from the old password",
  path: ["newPassword"],
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;