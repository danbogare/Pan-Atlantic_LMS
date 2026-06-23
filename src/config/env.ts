import dotenv from 'dotenv';

dotenv.config();

export interface IAdminSeedConfig {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}


interface EnvConfig {
  nodeEnv: string;
  port: number;
  mongoUri: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  admin: IAdminSeedConfig;
  resendApiKey: string;
}
// Reads a required env var or throws immediately.
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env: EnvConfig = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  mongoUri: requireEnv('MONGO_URI'),
  resendApiKey: requireEnv('RESEND_API_KEY'),
  smtpHost: requireEnv('SMTP_HOST'),
  smtpPort: Number(requireEnv('SMTP_PORT')),
  smtpUser: requireEnv('SMTP_USER'),
  smtpPass: requireEnv('SMTP_PASS'),
  admin: {
    email: requireEnv('ADMIN_EMAIL'),
    password: requireEnv('ADMIN_PASSWORD'),
    firstName: requireEnv('ADMIN_FIRST_NAME'),
    lastName: requireEnv('ADMIN_LAST_NAME'),
  },
};