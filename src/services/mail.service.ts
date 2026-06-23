import nodemailer, { Transporter } from "nodemailer";
import { Resend } from "resend";
import { studentInviteTemplate } from "../templates/student-invite.template";

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

interface IMailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
}

export class SMTPProvider implements IMailProvider {
  private transporter: Transporter;

  constructor(config: IMailConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      auth: config.smtpUser
        ? {
            user: config.smtpUser,
            pass: config.smtpPass,
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
}