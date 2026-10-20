import { IEnrollment } from "../models/course.model";
import { IPayment } from "../models/payment.model";

// FLUTTERWAVE V3 API SHAPES

// Every Flutterwave v3 response is wrapped in { status, message, data }
export interface FlutterwaveResponse<T> {
  status: "success" | "error";
  message: string;
  data: T;
}

// POST /payments (Flutterwave Standard)
export interface FlutterwaveInitializePayload {
  tx_ref: string;
  amount: number;
  currency: string;
  redirect_url: string;
  customer: {
    email: string;
    name?: string;
    phonenumber?: string;
  };
  customizations?: {
    title?: string;
    description?: string;
    logo?: string;
  };
  meta?: Record<string, string>;
}

export interface FlutterwaveInitializeData {
  link: string;
}

export type FlutterwaveTransactionStatus = "successful" | "failed" | "pending" | string;

// GET /transactions/:id/verify and GET /transactions/verify_by_reference
export interface FlutterwaveTransaction {
  id: number;
  tx_ref: string;
  flw_ref: string;
  amount: number;
  charged_amount: number;
  currency: string;
  status: FlutterwaveTransactionStatus;
  payment_type?: string;
  created_at: string;
  customer: {
    id: number;
    email: string;
    name?: string;
    phone_number?: string;
  };
  meta?: Record<string, unknown> | null;
}

// APP PAYLOADS

export interface CourseApplicationResult {
  // Paid course: send the student to this Flutterwave checkout link
  paymentLink: string | null;
  txRef: string | null;
  amount: number;
  currency: string;
  // Free course: the student is enrolled straight away
  enrollment: IEnrollment | null;
}

export interface VerifyPaymentQuery {
  tx_ref: string;
  transaction_id?: string;
  status?: string;
}

export interface PaymentVerificationResult {
  payment: IPayment;
  // Present once the payment has succeeded
  enrollment: IEnrollment | null;
}
