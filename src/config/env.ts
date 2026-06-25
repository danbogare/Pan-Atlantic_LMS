import dotenv from 'dotenv';

dotenv.config();

export interface IAdminSeedConfig {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ISMTPConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}


interface EnvConfig {
  nodeEnv: string;
  port: number;
  mongoUri: string;
  jwtSecret: string;
  smtp: ISMTPConfig;
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
  jwtSecret: requireEnv('JWT_ACCESS_SECRET'),
  resendApiKey: requireEnv('RESEND_API_KEY'),
  smtp: {
    host: requireEnv('SMTP_HOST'),
    port: Number(requireEnv('SMTP_PORT')),
    user: requireEnv('SMTP_USER'),
    pass: requireEnv('SMTP_PASS'),
  },
  admin: {
    email: requireEnv('ADMIN_EMAIL'),
    password: requireEnv('ADMIN_PASSWORD'),
    firstName: requireEnv('ADMIN_FIRST_NAME'),
    lastName: requireEnv('ADMIN_LAST_NAME'),
  },
};