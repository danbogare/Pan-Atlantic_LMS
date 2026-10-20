import { Request, Response } from "express";
import { IPaymentService } from "../services/payment.service";
import { createdSuccessResponse, successResponse } from "../utils/response";
import { parseQuery } from "../utils/query";
import { verifyPaymentQuerySchema } from "../validators/payment.validator";
import { PaymentStatus } from "../models/payment.model";
import { AppError } from "../errors/error";

export interface IPaymentController {
  applyForCourse: (req: Request<{ courseId: string }>, res: Response) => Promise<void>;
  verifyPayment: (req: Request, res: Response) => Promise<void>;
  getPaymentByTxRef: (req: Request<{ txRef: string }>, res: Response) => Promise<void>;
}

const PAYMENT_STATUS_MESSAGES: Record<PaymentStatus, string> = {
  [PaymentStatus.SUCCESSFUL]: "Payment verified and enrollment completed",
  [PaymentStatus.PENDING]: "Payment is still being processed, please check again shortly",
  [PaymentStatus.FAILED]: "Payment failed",
  [PaymentStatus.CANCELLED]: "Payment was cancelled",
};

export class PaymentController implements IPaymentController {
  constructor(
    private readonly paymentService: IPaymentService,
    // Frontend page the student is sent to after verification, e.g. https://app.example.com/enroll/complete
    private readonly applicationResultUrl: string
  ) {}

  public applyForCourse = async (req: Request<{ courseId: string }>, res: Response): Promise<void> => {
    const { courseId } = req.params;
    const studentId = req.user?.id as string;

    const result = await this.paymentService.applyForCourse(studentId, courseId);

    if (result.enrollment) {
      createdSuccessResponse(res, "Enrolled in free course successfully", result);
      return;
    }
    createdSuccessResponse(res, "Application created, proceed to payment", result);
  };

  // Flutterwave callback (redirect_url). The student's browser lands here from checkout, so it always
  // redirects to the frontend with the txRef; the frontend then reads the outcome from GET /payments/:txRef.
  public verifyPayment = async (req: Request, res: Response): Promise<void> => {
    const params: Record<string, string> = {};
    try {
      const query = parseQuery(verifyPaymentQuerySchema, req.query);
      params.txRef = query.tx_ref;
      await this.paymentService.verifyPayment(query);
    } catch (error) {
      // The payment stays pending and GET /payments/:txRef retries the verification,
      // so only report an error when there is no reference to look up
      console.error(error);
      if (!params.txRef) {
        params.error = error instanceof AppError ? error.message : "We could not verify your payment, please contact support";
      }
    }

    res.redirect(302, `${this.applicationResultUrl}?${new URLSearchParams(params).toString()}`);
  };

  public getPaymentByTxRef = async (req: Request<{ txRef: string }>, res: Response): Promise<void> => {
    const { txRef } = req.params;
    const result = await this.paymentService.getPaymentByTxRef(txRef, req.user!);
    successResponse(res, PAYMENT_STATUS_MESSAGES[result.payment.status], result);
  };
}
