import nodemailer, { Transporter } from "nodemailer";
import { Resend } from "resend";
import { studentInviteTemplate } from "../templates/student-invite.template";
import { passwordResetTemplate } from "../templates/password-reset.template";
import { ISMTPConfig } from "../config/env";

export interface IMailProvider {
  send(to: string, subject: string, html: string): Promise<void>;
}


export class ResendProvider implements IMailProvider {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    await this.resend.emails.send({
      from: "LMS <onboarding@yourdomain.com>",
      to: [to],
      subject,
      html,
    });
  }
}

export class SMTPProvider implements IMailProvider {
  private transporter: Transporter;

  constructor(config: ISMTPConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      auth: config.user
        ? {
            user: config.user,
            pass: config.pass,
          }
        : undefined,
    });
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    await this.transporter.sendMail({
      from: "LMS <no-reply@local.dev>",
      to,
      subject,
      html,
    });
  }
}

export interface IMailService {
  sendStudentInviteEmail(email: string, firstName: string, tempPassword: string): Promise<void>;
  sendPasswordResetEmail(email: string, firstName: string, otp: string, expiresInMinutes?: number ): Promise<void>;
}
export class MailService implements IMailService {
  constructor(private provider: IMailProvider) {}

  async sendStudentInviteEmail(
    email: string,
    firstName: string,
    tempPassword: string
  ): Promise<void> {
    const subject =
      "Welcome to Pan-Atlantic LMS - Complete Your Registration";

    const html = studentInviteTemplate(firstName, tempPassword);

    try {
      await this.provider.send(email, subject, html);

      console.log(`Email sent to ${email}`);
    } catch (error) {
      console.error(`Email failed for ${email}:`, error);

      // IMPORTANT: don't silently succeed
      throw error;
    }
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    otp: string,
    expiresInMinutes: number = 5
  ): Promise<void> {
    const subject = "Reset Your Pan-Atlantic LMS Password";
    const html = passwordResetTemplate(firstName, otp, expiresInMinutes);

    try {
      await this.provider.send(email, subject, html);
      console.log(`Email sent to ${email}`);
    } catch (error) {
      console.error(`Email failed for ${email}:`, error);
      // IMPORTANT: don't silently succeed
      throw error;
    }
  }
}