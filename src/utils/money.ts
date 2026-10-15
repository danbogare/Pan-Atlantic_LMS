// Prices are stored in naira (the unit Flutterwave expects). Allow at most 2 decimal places (kobo).
// Compared with a small tolerance because values like 0.29 * 100 aren't exact in floating point.
export function hasAtMostTwoDecimals(value: number): boolean {
  const scaled = value * 100;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}
