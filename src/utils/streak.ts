import { ACCESS_TIME_ZONE } from "./course-access";

const DAY_MS = 24 * 60 * 60 * 1000;

// Calendar day (in the given time zone) as a whole number, so consecutive days differ by exactly 1
function dayNumber(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(get("year"), get("month") - 1, get("day")) / DAY_MS;
}

// Streak after learning activity at `now`: same day keeps it, the next day extends it, a gap restarts it at 1
export function nextLearningStreak(
  currentStreak: number,
  lastActivityAt: Date | null | undefined,
  now: Date = new Date(),
  timeZone: string = ACCESS_TIME_ZONE
): number {
  if (!lastActivityAt) return 1;

  const daysSince = dayNumber(now, timeZone) - dayNumber(new Date(lastActivityAt), timeZone);
  if (daysSince <= 0) return Math.max(currentStreak, 1);
  if (daysSince === 1) return currentStreak + 1;
  return 1;
}

// Streak as it stands right now: a stored streak whose last activity was before yesterday has lapsed
export function currentLearningStreak(
  storedStreak: number,
  lastActivityAt: Date | null | undefined,
  now: Date = new Date(),
  timeZone: string = ACCESS_TIME_ZONE
): number {
  if (!lastActivityAt) return 0;

  const daysSince = dayNumber(now, timeZone) - dayNumber(new Date(lastActivityAt), timeZone);
  return daysSince <= 1 ? storedStreak : 0;
}

// Overwrites a loaded user's learningStreak with its current value (in memory only), for responses
export function withCurrentStreak<T extends { learningStreak?: number; lastActivityAt?: Date | null }>(user: T): T {
  user.learningStreak = currentLearningStreak(user.learningStreak ?? 0, user.lastActivityAt);
  return user;
}
