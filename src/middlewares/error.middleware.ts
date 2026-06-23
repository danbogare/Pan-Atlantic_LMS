import { Request, Response, NextFunction } from "express";

export class ErrorMiddleware {
  constructor(private environment: string) {}

  public handle = (
    error: any,
    _req: Request,
    res: Response,
    _next: NextFunction
  ): void => {
    console.error(error);

    const statusCode = error?.statusCode || 500;
    const message = error?.message || "Internal Server Error";

    res.status(statusCode).json({
      success: false,
      message,
      stack: this.environment === "development" ? error.stack : undefined,
    });
  };
}