import { Router } from "express";
import { IPaymentController } from "../controllers/payment.controller";
import { IAuthMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler.middleware";

export class PaymentRouter {
  private readonly router = Router();

  constructor(
    private readonly paymentController: IPaymentController,
    private readonly authMiddleware: IAuthMiddleware
  ) {
    this.initializeRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private initializeRoutes(): void {
    // Public — Flutterwave redirect_url: ?status=&tx_ref=&transaction_id=.
    // Verifies with Flutterwave, then redirects on to FRONTEND_URL/enroll/complete?txRef=
    this.router.get("/verify", asyncHandler(this.paymentController.verifyPayment));

    // Payment status for the frontend after the redirect (own payments only; admins see all)
    this.router.get(
      "/:txRef",
      asyncHandler(this.authMiddleware.requireAuth),
      asyncHandler(this.paymentController.getPaymentByTxRef)
    );
  }
}
