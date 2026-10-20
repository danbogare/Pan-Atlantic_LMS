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

export interface ICloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface IFlutterwaveConfig {
  flwUri: string;
  flwSecret: string;
  flwKey: string;
}


interface EnvConfig {
  nodeEnv: string;
  port: number;
  apiUrl: string;
  frontendUrl: string;
  mongoUri: string;
  jwtSecret: string;
  smtp: ISMTPConfig;
  admin: IAdminSeedConfig;
  resendApiKey: string;
  mailFrom: string;
  trustProxy: number;
  cloudinary: ICloudinaryConfig
  flutterwave: IFlutterwaveConfig
}
// Reads a required env var or throws immediately.
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Hop count of trusted proxies; falls back to the default when unset or not a non-negative integer.
function parseTrustProxy(value: string | undefined, fallback: number): number {
  const hops = Number(value);
  return value !== undefined && Number.isInteger(hops) && hops >= 0 ? hops : fallback;
}

export const env: EnvConfig = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  apiUrl: process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`,
  frontendUrl: process.env.FRONTEND_URL ?? `http://localhost:3000`,
  mongoUri: requireEnv('MONGO_URI'),
  jwtSecret: requireEnv('JWT_ACCESS_SECRET'),
  resendApiKey: requireEnv('RESEND_API_KEY'),
  // Sender shown on outgoing emails; in production it must be on a domain verified with the mail provider
  mailFrom: process.env.MAIL_FROM ?? 'Pan-Atlantic LMS <no-reply@local.dev>',
  // Number of reverse proxies in front of the app (needed for correct client IPs in rate limiting)
  // Heroku sets DYNO on every dyno and always routes through one proxy, so trust it even if NODE_ENV isn't production
  trustProxy: parseTrustProxy(
    process.env.TRUST_PROXY,
    process.env.DYNO || process.env.NODE_ENV === 'production' ? 1 : 0
  ),
  smtp: {
    host: requireEnv('SMTP_HOST'),
    port: Number(requireEnv('SMTP_PORT')),
    user: requireEnv('SMTP_USER'),
    pass: requireEnv('SMTP_PASS'),
  },
  admin: {
    email: requireEnv('ADMIN_EMAIL'),
    password: requireEnv('ADMIN_PASS'),
    firstName: requireEnv('ADMIN_FIRST_NAME'),
    lastName: requireEnv('ADMIN_LAST_NAME'),
  },
  cloudinary: {
    cloudName: requireEnv('CLOUDINARY_CLOUD_NAME'),
    apiKey: requireEnv('CLOUDINARY_API_KEY'),
    apiSecret: requireEnv('CLOUDINARY_API_SECRET'),
  },
  flutterwave: {
    flwUri: requireEnv('FLW_URI'),
    flwSecret: requireEnv('FLW_SECRET'),
    flwKey: requireEnv('FLW_KEY'),
  }
};