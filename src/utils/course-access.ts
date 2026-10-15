import { IEnrollment } from "../models/course.model";

export const ACCESS_TIME_ZONE = "Africa/Lagos";
const DAY_MS = 24 * 60 * 60 * 1000;

// Offset (ms) between the given time zone and UTC at a specific instant
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// Midnight at the start of the next calendar day in the given time zone
export function startOfNextDay(date: Date, timeZone: string = ACCESS_TIME_ZONE): Date {
  const local = new Date(date.getTime() + timeZoneOffsetMs(date, timeZone));
  const nextLocalMidnightAsUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1);
  const guess = new Date(nextLocalMidnightAsUtc);
  return new Date(nextLocalMidnightAsUtc - timeZoneOffsetMs(guess, timeZone));
}

export interface AccessWindow {
  accessStartsAt: Date;
  accessExpiresAt: Date | null;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

// The clock starts the day after enrollment; a duration of 0 days means the access never expires
export function computeAccessWindow(durationDays: number, from: Date = new Date()): AccessWindow {
  const accessStartsAt = startOfNextDay(from);
  const accessExpiresAt = durationDays > 0 ? addDays(accessStartsAt, durationDays) : null;
  return { accessStartsAt, accessExpiresAt };
}

export function isAccessExpired(enrollment: Pick<IEnrollment, "accessExpiresAt">, now: Date = new Date()): boolean {
  return !!enrollment.accessExpiresAt && now.getTime() >= new Date(enrollment.accessExpiresAt).getTime();
}

export interface AccessSummary {
  enrolledAt: Date;
  accessStartsAt: Date | null;
  accessExpiresAt: Date | null;
  isExpired: boolean;
  // null when access never expires
  daysRemaining: number | null;
}

export function summarizeAccess(
  enrollment: Pick<IEnrollment, "enrolledAt" | "accessStartsAt" | "accessExpiresAt">,
  now: Date = new Date()
): AccessSummary {
  const expiresAt = enrollment.accessExpiresAt ? new Date(enrollment.accessExpiresAt) : null;
  return {
    enrolledAt: enrollment.enrolledAt,
    accessStartsAt: enrollment.accessStartsAt ?? null,
    accessExpiresAt: expiresAt,
    isExpired: isAccessExpired(enrollment, now),
    daysRemaining: expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS)) : null,
  };
}
