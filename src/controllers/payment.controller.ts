import { Request, Response } from "express";
import { IPaymentService } from "../services/payment.service";
import { createdSuccessResponse, successResponse } from "../utils/response";
import { parseQuery } from "../utils/query";
import { verifyPaymentQuerySchema } from "../validators/payment.validator";
import { PaymentStatus } from "../models/payment.model";

export interface IPaymentController {
  applyForCourse: (req: Request<{ courseId: string }>, res: Response) => Promise<void>;
  verifyPayment: (req: Request, res: Response) => Promise<void>;
}

const VERIFICATION_MESSAGES: Record<PaymentStatus, string> = {
  [PaymentStatus.SUCCESSFUL]: "Payment verified and enrollment completed",
  [PaymentStatus.PENDING]: "Payment is still being processed, please check again shortly",
  [PaymentStatus.FAILED]: "Payment failed",
  [PaymentStatus.CANCELLED]: "Payment was cancelled",
};

export class PaymentController implements IPaymentController {
  constructor(private readonly paymentService: IPaymentService) {}

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

  // Flutterwave callback (redirect_url); public because the student's browser lands here from checkout
  public verifyPayment = async (req: Request, res: Response): Promise<void> => {
    const query = parseQuery(verifyPaymentQuerySchema, req.query);
    const result = await this.paymentService.verifyPayment(query);
    successResponse(res, VERIFICATION_MESSAGES[result.payment.status], result);
  };
}
