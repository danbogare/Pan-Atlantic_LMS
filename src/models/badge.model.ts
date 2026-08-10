import { Schema, model, Document, Types } from 'mongoose';

export enum BadgeCriteriaType {
  COURSES_COMPLETED = 'courses_completed',
  LEARNING_STREAK = 'learning_streak',
  ENROLLMENT_COUNT = 'enrollment_count',
}

export interface IBadge extends Document {
  key: string;
  name: string;
  description: string;
  icon?: string;
  criteriaType: BadgeCriteriaType;
  criteriaValue: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BadgeSchema = new Schema<IBadge>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    icon: { type: String },
    criteriaType: { type: String, enum: Object.values(BadgeCriteriaType), required: true },
    criteriaValue: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export interface IUserBadge extends Document {
  user: Types.ObjectId;
  badge: Types.ObjectId;
  earnedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserBadgeSchema = new Schema<IUserBadge>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    badge: { type: Schema.Types.ObjectId, ref: 'Badge', required: true },
    earnedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

UserBadgeSchema.index({ user: 1, badge: 1 }, { unique: true });

export const Badge = model<IBadge>('Badge', BadgeSchema);
export const UserBadge = model<IUserBadge>('UserBadge', UserBadgeSchema);