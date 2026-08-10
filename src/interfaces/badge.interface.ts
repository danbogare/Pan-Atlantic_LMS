import { BadgeCriteriaType } from "../models/badge.model";

export interface CreateBadgePayload {
  key: string;
  name: string;
  description: string;
  icon?: string;
  criteriaType: BadgeCriteriaType;
  criteriaValue: number;
}

export type UpdateBadgePayload = Partial<CreateBadgePayload>;