export interface IMailConfig {
  environment: 'development' | 'production' | string;
  fromEmail: string;
  resendApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
}