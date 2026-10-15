import { Request, RequestHandler } from "express";
import { rateLimit, ipKeyGenerator, Options } from "express-rate-limit";

// Counters live in process memory: with several instances each one keeps its own counts.
// Move to a shared store (e.g. Redis) if the API is scaled horizontally.

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

const emailFromBody = (req: Request): string =>
  typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

const ipKey = (req: Request): string => ipKeyGenerator(req.ip ?? "unknown");

const createLimiter = (
  windowMs: number,
  limit: number,
  message: string,
  overrides: Partial<Options> = {}
): RequestHandler =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { success: false, message },
    ...overrides,
  });

// Login: only failed attempts count, so busy shared networks (campus NAT) aren't blocked by normal use.
// Per IP+email stops guessing one account; per IP stops spraying many accounts.
export const loginRateLimiters: RequestHandler[] = [
  createLimiter(FIFTEEN_MINUTES, 50, "Too many failed login attempts from this network. Please try again later.", {
    keyGenerator: ipKey,
    skipSuccessfulRequests: true,
  }),
  createLimiter(FIFTEEN_MINUTES, 10, "Too many failed login attempts. Please try again in 15 minutes.", {
    keyGenerator: (req) => `${ipKey(req)}:${emailFromBody(req)}`,
    skipSuccessfulRequests: true,
  }),
];

// Requesting a reset code sends an email, so every request counts.
export const passwordResetRequestRateLimiters: RequestHandler[] = [
  createLimiter(ONE_HOUR, 30, "Too many password reset requests from this network. Please try again later.", {
    keyGenerator: ipKey,
  }),
  createLimiter(ONE_HOUR, 5, "Too many password reset requests. Please try again later.", {
    keyGenerator: (req) => `${ipKey(req)}:${emailFromBody(req)}`,
  }),
];

// Submitting a reset code: keyed on the email alone so rotating IPs can't brute-force a 6-digit OTP.
export const passwordResetConfirmRateLimiters: RequestHandler[] = [
  createLimiter(FIFTEEN_MINUTES, 10, "Too many incorrect reset attempts. Please request a new code later.", {
    keyGenerator: (req) => `reset:${emailFromBody(req)}`,
    skipSuccessfulRequests: true,
  }),
];
