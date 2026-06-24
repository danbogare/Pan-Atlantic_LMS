import { Schema, model, Document, Types } from 'mongoose';

export enum OtpPurpose {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  TWO_FACTOR = '2fa'
}

export interface IOtp extends Document {
  userId: Types.ObjectId;
  code: string; // Stored as a hash for security
  purpose: OtpPurpose;
  createdAt: Date;
}

const OtpSchema = new Schema<IOtp>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: Object.values(OtpPurpose),
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // Automatically deletes the document after 5 minutes (300 seconds)
    expires: 300 
  }
});

// Compound index to quickly find a specific valid OTP for a user
OtpSchema.index({ userId: 1, purpose: 1 });

export const Otp = model<IOtp>('Otp', OtpSchema);