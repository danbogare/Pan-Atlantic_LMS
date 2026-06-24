// Generates the HTML layout for the student invitation welcome email.
export function studentInviteTemplate(firstName: string, tempPassword: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #1a365d;">Welcome to Pan-Atlantic LMS, ${firstName}!</h2>
      <p>Your student account has been created and is ready to use.</p>
      <p>Log in using your registered email address and the temporary password below:</p>

      <div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #3182ce; margin: 20px 0; font-family: monospace; font-size: 16px;">
        <strong>Temporary Password:</strong> ${tempPassword}
      </div>

      <p style="color: #e53e3e; font-weight: bold;">⚠️ For security reasons, you'll be required to change this password the first time you log in.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #718096;">This is an automated message. Please do not reply directly to this email.</p>
    </div>
  `;
}