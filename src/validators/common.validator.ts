// validators/common.validator.ts
import { z } from "zod";
import "../openapi/registry";
import { hasAtMostTwoDecimals } from "../utils/money";

/**
 * Reusable schema fragments shared across course/module/lesson validators.
 *
 * IMPORTANT: these are content-type agnostic. A field might arrive as:
 *   - a native type (number/boolean/array) — JSON body requests
 *   - a string — multipart/form-data requests (multer, busboy, etc. put
 *     every non-file field into req.body as a string, always)
 *
 * Each numeric/boolean/array helper below normalizes both shapes before
 * validating, so the SAME schema works whether a given route is JSON or
 * multipart — you don't need separate "coerced" vs "native" versions per
 * route type anymore.
 */
// PREPROCESSORS

const toNumberOrPassthrough = (val: unknown) => {
  if (typeof val !== 'string') return val; // already a number, or undefined/null — let zod handle it
  const trimmed = val.trim();
  if (trimmed === '') return undefined; // treat blank form field as "not provided"
  return Number(trimmed); // z.number() will reject this if it's NaN
};

const toBooleanOrPassthrough = (val: unknown) => {
  if (typeof val !== 'string') return val; // already boolean, or undefined/null
  if (val === 'true') return true;
  if (val === 'false') return false;
  return val; // anything else (e.g. "yes") — let zod reject it with a clear error
};

const toArrayOrPassthrough = (val: unknown) => {
  if (typeof val !== 'string') return val; // already an array, or undefined/null
  const trimmed = val.trim();
  if (trimmed === '') return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return val; // invalid JSON — let zod reject it rather than crashing here
  }
};


// STRINGS (unaffected by content-type — strings arrive as strings either way)
export const requiredTitle = (fieldLabel: string, maxLength = 200) =>
  z
    .string({ error: `${fieldLabel} is required` })
    .trim()
    .min(1, { error: `${fieldLabel} cannot be empty` })
    .max(maxLength, { error: `${fieldLabel} must be less than ${maxLength} characters` })
    .openapi({ description: fieldLabel });

export const optionalTitle = (fieldLabel: string, maxLength = 200) =>
  z
    .string()
    .trim()
    .min(1, { error: `${fieldLabel} cannot be empty` })
    .max(maxLength, { error: `${fieldLabel} must be less than ${maxLength} characters` })
    .optional()
    .openapi({ description: fieldLabel });

export const idField = (fieldLabel: string) =>
  z.string({ error: `${fieldLabel} is required` })
  .openapi({ description: fieldLabel, example: "clv9x...abc" });

// NUMBERS

export const requiredNonNegativeNumber = (fieldLabel: string) =>
  z.preprocess(
    toNumberOrPassthrough,
    z
      .number({ error: `${fieldLabel} must be a valid number` })
      .min(0, { error: `${fieldLabel} cannot be negative` })
  ).openapi({ type: "number", description: fieldLabel, example: 1 });

export const optionalNonNegativeNumber = (fieldLabel: string) =>
  z.preprocess(
    toNumberOrPassthrough,
    z
      .number({ error: `${fieldLabel} must be a valid number` })
      .min(0, { error: `${fieldLabel} cannot be negative` })
      .optional()
      .openapi({ type: "number", description: fieldLabel, example: 1 })
  );

/** Required number field with a fallback when the field is omitted entirely. */
export const nonNegativeNumberWithDefault = (fieldLabel: string, defaultValue: number) =>
  z
    .preprocess(
      toNumberOrPassthrough,
      z.number({ error: `${fieldLabel} must be a valid number` }).min(0, { error: `${fieldLabel} cannot be negative` })
    )
    .default(defaultValue)
    .openapi({ type: "number", description: fieldLabel, example: defaultValue });;

/** Optional whole number >= 0 (e.g. days). */
export const optionalNonNegativeInteger = (fieldLabel: string) =>
  z.preprocess(
    toNumberOrPassthrough,
    z
      .number({ error: `${fieldLabel} must be a valid number` })
      .int({ error: `${fieldLabel} must be a whole number` })
      .min(0, { error: `${fieldLabel} cannot be negative` })
      .optional()
      .openapi({ type: "integer", description: fieldLabel, example: 0 })
  );

/** Whole number >= 0 with a fallback when the field is omitted entirely. */
export const nonNegativeIntegerWithDefault = (fieldLabel: string, defaultValue: number) =>
  z
    .preprocess(
      toNumberOrPassthrough,
      z
        .number({ error: `${fieldLabel} must be a valid number` })
        .int({ error: `${fieldLabel} must be a whole number` })
        .min(0, { error: `${fieldLabel} cannot be negative` })
    )
    .default(defaultValue)
    .openapi({ type: "integer", description: fieldLabel, example: defaultValue });

/** Money amount >= 0 with at most 2 decimal places, with a fallback when omitted. */
export const nonNegativeMoneyWithDefault = (fieldLabel: string, defaultValue: number) =>
  z
    .preprocess(
      toNumberOrPassthrough,
      z
        .number({ error: `${fieldLabel} must be a valid number` })
        .min(0, { error: `${fieldLabel} cannot be negative` })
        .refine(hasAtMostTwoDecimals, { error: `${fieldLabel} can have at most 2 decimal places` })
    )
    .default(defaultValue)
    .openapi({ type: "number", description: fieldLabel, example: defaultValue });

/** Optional money amount >= 0 with at most 2 decimal places. */
export const optionalNonNegativeMoney = (fieldLabel: string) =>
  z.preprocess(
    toNumberOrPassthrough,
    z
      .number({ error: `${fieldLabel} must be a valid number` })
      .min(0, { error: `${fieldLabel} cannot be negative` })
      .refine(hasAtMostTwoDecimals, { error: `${fieldLabel} can have at most 2 decimal places` })
      .optional()
      .openapi({ type: "number", description: fieldLabel, example: 25000 })
  );

// BOOLEANS

export const requiredBoolean = (fieldLabel: string) =>
  z.preprocess(toBooleanOrPassthrough, z.boolean({ error: `${fieldLabel} must be true or false` }))
  .openapi({ type: "boolean", description: fieldLabel, example: true });;

export const optionalBoolean = (fieldLabel: string) =>
  z.preprocess(toBooleanOrPassthrough, z.boolean({ error: `${fieldLabel} must be true or false` }).optional())
  .openapi({ type: "boolean", description: fieldLabel, example: true });

// ARRAYS (JSON-stringified in multipart, native array in JSON body)

export const optionalStringArray = () =>
  z.preprocess(toArrayOrPassthrough, z.array(z.string()).optional())
  .openapi({ type: "array", items: { type: "string" } });

// URLS

export const urlOrEmpty = z
  .union([z.url({ error: "Invalid URL format" }), z.literal('')])
  .optional()
  .openapi({ example: "https://cdn.example.com/video.mp4" });