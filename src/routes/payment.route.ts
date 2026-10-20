import { Router } from "express";
import { IPaymentController } from "../controllers/payment.controller";
import { asyncHandler } from "../middlewares/async-handler.middleware";

// Payment provider callbacks. Unauthenticated: Flutterwave redirects the student's browser here,
// and every payment is re-verified with Flutterwave before anything is granted.
export class PaymentRouter {
  private readonly router = Router();

  constructor(private readonly paymentController: IPaymentController) {
    this.initializeRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private initializeRoutes(): void {
    // Flutterwave redirect_url: ?status=&tx_ref=&transaction_id=
    this.router.get("/verify", asyncHandler(this.paymentController.verifyPayment));
  }
}
