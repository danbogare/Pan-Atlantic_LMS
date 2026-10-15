import { escapeHtml } from "../utils/html";

// Generates the HTML layout for the welcome email sent after a student signs up themselves.
export function studentWelcomeTemplate(firstName: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #1a365d;">Welcome to Pan-Atlantic LMS, ${escapeHtml(firstName)}!</h2>
      <p>Your student account has been created successfully.</p>
      <p>You can now log in with your email address and the password you chose to browse courses and start learning.</p>

      <p>If you didn't create this account, please ignore this email or reset your password using "Forgot password" on the login page.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #718096;">This is an automated message. Please do not reply directly to this email.</p>
    </div>
  `;
}
