// Generates the HTML layout for the student invitation welcome email.
export function studentInviteTemplate(firstName: string, tempPassword: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #1a365d;">Welcome to Pan-Atlantic LMS, ${firstName}!</h2>
      <p>An administrator has successfully provisioned your student account dashboard.</p>
      <p>To finalize your initialization profile, log in using your registered email and the temporary password provided below:</p>
      
      <div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #3182ce; margin: 20px 0; font-family: monospace; font-size: 16px;">
        <strong>Temporary Password:</strong> ${tempPassword}
      </div>
      
      <p style="color: #e53e3e; font-weight: bold;">⚠️ You will be required to change this password immediately upon your first authentication lifecycle.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #718096;">This is an automated system dispatch. Please do not reply directly to this message.</p>
    </div>
  `;
}