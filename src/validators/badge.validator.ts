import { z } from "zod";
import "../openapi/registry";
import { requiredTitle, optionalTitle, requiredNonNegativeNumber, optionalNonNegativeNumber } from "./common.validator";
import { BadgeCriteriaType } from "../models/badge.model";

export const createBadgeSchema = z.object({
  key: z.string({ error: "Badge key is required" }).trim().min(1).openapi({ example: "fast-learner" }),
  name: requiredTitle("Badge name"),
  description: z.string({ error: "Description is required" }).trim().min(1).openapi({ example: "Complete 5 courses" }),
  icon: z.string().trim().optional().openapi({ example: "https://cdn.example.com/badges/fast-learner.svg" }),
  criteriaType: z.enum(BadgeCriteriaType, { error: "Invalid criteria type" }),
  criteriaValue: requiredNonNegativeNumber("Criteria value"),
});

export type CreateBadgeInput = z.infer<typeof createBadgeSchema>;

export const updateBadgeSchema = z.object({
  name: optionalTitle("Badge name"),
  description: z.string().trim().min(1).optional(),
  icon: z.string().trim().optional(),
  criteriaType: z.enum(BadgeCriteriaType).optional(),
  criteriaValue: optionalNonNegativeNumber("Criteria value"),
});

export type UpdateBadgeInput = z.infer<typeof updateBadgeSchema>;