import { Schema, model, Document, Types } from 'mongoose';
import { UserRole } from './user.model';

export enum NotificationType {
  COURSE_UPDATE = 'course_update',
  ASSIGNMENT_DUE = 'assignment_due',
  GRADE_POSTED = 'grade_posted',
  ANNOUNCEMENT = 'announcement',
  ENROLLMENT = 'enrollment',
  SYSTEM = 'system',
}


export enum AudienceType {
  INDIVIDUAL = 'individual',
  ROLE_BROADCAST = 'role_broadcast',
  ALL = 'all',
}

export interface INotification extends Document {
  recipient: Types.ObjectId;       // the actual user this doc belongs to (always set, even for broadcasts)
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  readAt?: Date;

  // audit trail for broadcasts — doesn't affect querying, just tells you *why* this notification exists
  audienceType: AudienceType;
  targetRole?: UserRole;           // set when audienceType === 'role_broadcast'
  createdBy?: Types.ObjectId;      // which admin sent it

  relatedEntity?: {
    entityType: 'Course' | 'Assignment' | 'Submission' | 'Announcement';
    entityId: Types.ObjectId;
  };
  actionUrl?: string;

  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['course_update', 'assignment_due', 'grade_posted', 'announcement', 'enrollment', 'system'],
    required: true,
  },
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date },

  audienceType: {
    type: String,
    enum: Object.values(AudienceType),
    default: AudienceType.INDIVIDUAL,
  },
  targetRole: { type: String, enum: ['student', 'instructor', 'admin'] },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },

  relatedEntity: {
    entityType: { type: String, enum: ['Course', 'Assignment', 'Submission', 'Announcement'] },
    entityId: { type: Schema.Types.ObjectId },
  },
  actionUrl: { type: String, trim: true },
}, {
  timestamps: true,
});

NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', NotificationSchema);