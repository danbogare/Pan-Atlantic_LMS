import { Schema, model, Document, Types } from 'mongoose';
import { Currency } from './course.model';

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESSFUL = 'successful',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum PaymentProvider {
  FLUTTERWAVE = 'flutterwave',
}

// A student's payment for a course application
export interface IPayment extends Document {
  student: Types.ObjectId;
  course: Types.ObjectId;
  // Our reference, sent to Flutterwave as tx_ref and returned on the redirect
  txRef: string;
  // Course price at the time of applying, in naira
  amount: number;
  currency: Currency;
  provider: PaymentProvider;
  status: PaymentStatus;
  paymentLink?: string;
  // Filled in from Flutterwave once the transaction is verified
  transactionId?: string;
  flwRef?: string;
  amountPaid?: number;
  paymentType?: string;
  paidAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    txRef: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: Object.values(Currency), default: Currency.NGN },
    provider: { type: String, enum: Object.values(PaymentProvider), default: PaymentProvider.FLUTTERWAVE },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    paymentLink: { type: String },
    transactionId: { type: String },
    flwRef: { type: String },
    amountPaid: { type: Number },
    paymentType: { type: String },
    paidAt: { type: Date },
    failureReason: { type: String },
  },
  { timestamps: true }
);

PaymentSchema.index({ student: 1, course: 1, status: 1 });
PaymentSchema.index({ course: 1, status: 1 });

export const Payment = model<IPayment>('Payment', PaymentSchema);
