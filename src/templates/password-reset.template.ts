export function passwordResetTemplate(
  firstName: string,
  otp: string,
  expiresInMinutes: number = 5
): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #1a365d;">Password Reset Request</h2>
      <p>Hi ${firstName},</p>
      <p>We received a request to reset the password for your Pan-Atlantic LMS account. Use the verification code below to continue:</p>

      <div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #3182ce; margin: 20px 0; text-align: center;">
        <span style="font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1a365d;">${otp}</span>
      </div>

      <p style="color: #e53e3e; font-weight: bold;">⚠️ This code will expire in ${expiresInMinutes} minutes.</p>
      <p>If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #718096;">This is an automated message. Please do not reply directly to this email.</p>
    </div>
  `;
}