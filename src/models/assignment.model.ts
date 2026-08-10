import { Schema, model, Document, Types } from 'mongoose';

export enum SubmissionStatus {
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  RESUBMIT_REQUESTED = 'resubmit_requested',
}

export interface IAssignmentSubmission extends Document {
  student: Types.ObjectId;
  lesson: Types.ObjectId;
  course: Types.ObjectId;
  content?: string;
  fileUrl?: string;
  status: SubmissionStatus;
  grade?: number;
  feedback?: string;
  gradedBy?: Types.ObjectId;
  gradedAt?: Date;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSubmissionSchema = new Schema<IAssignmentSubmission>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'CourseLesson', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    content: { type: String },
    fileUrl: { type: String },
    status: {
      type: String,
      enum: Object.values(SubmissionStatus),
      default: SubmissionStatus.SUBMITTED,
    },
    grade: { type: Number, min: 0, max: 100 },
    feedback: { type: String },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    gradedAt: { type: Date },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// A student can resubmit, so this is NOT unique — keep full history, sort by submittedAt for "latest"
AssignmentSubmissionSchema.index({ student: 1, lesson: 1, submittedAt: -1 });
AssignmentSubmissionSchema.index({ course: 1, status: 1 });

export const AssignmentSubmission = model<IAssignmentSubmission>(
  'AssignmentSubmission',
  AssignmentSubmissionSchema
);