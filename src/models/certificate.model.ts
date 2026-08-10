import { Schema, model, Document, Types } from 'mongoose';
import { randomUUID } from 'crypto';

export interface ICertificate extends Document {
  student: Types.ObjectId;
  course: Types.ObjectId;
  enrollment: Types.ObjectId;
  certificateNumber: string;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CertificateSchema = new Schema<ICertificate>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    enrollment: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true },
    certificateNumber: {
      type: String,
      required: true,
      unique: true,
      default: () => randomUUID(),
    },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One certificate per student per course — prevents duplicate issuance
CertificateSchema.index({ student: 1, course: 1 }, { unique: true });
CertificateSchema.index({ certificateNumber: 1 }, { unique: true });

export const Certificate = model<ICertificate>('Certificate', CertificateSchema);