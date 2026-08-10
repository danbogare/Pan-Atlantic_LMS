import { Router } from "express";
import { ICertificateController } from "../controllers/certificate.controller";
import { IAuthMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler.middleware";

export class CertificateRouter {
  private readonly router = Router();

  constructor(
    private readonly certificateController: ICertificateController,
    private readonly authMiddleware: IAuthMiddleware
  ) {
    this.initializeRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private initializeRoutes(): void {
    // Public — no auth. Anyone with a certificate number can verify it.
    this.router.get(
      "/verify/:certificateNumber",
      asyncHandler(this.certificateController.verifyCertificate)
    );

    // Everything below requires auth
    this.router.use(asyncHandler(this.authMiddleware.requireAuth));

    this.router.get("/", asyncHandler(this.certificateController.getStudentCertificates));
  }
}