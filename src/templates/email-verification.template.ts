import { escapeHtml } from "../utils/html";

// Generates the HTML layout for the email-verification code sent after sign-up.
export function emailVerificationTemplate(firstName: string, code: string, expiresInMinutes: number): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #1a365d;">Verify your email address</h2>
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>Thanks for signing up to Pan-Atlantic LMS. Enter the code below to verify your email and activate your account:</p>

      <div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #3182ce; margin: 20px 0; text-align: center;">
        <span style="font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1a365d;">${escapeHtml(code)}</span>
      </div>

      <p style="color: #e53e3e; font-weight: bold;">⚠️ This code will expire in ${expiresInMinutes} minutes.</p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #718096;">This is an automated message. Please do not reply directly to this email.</p>
    </div>
  `;
}
