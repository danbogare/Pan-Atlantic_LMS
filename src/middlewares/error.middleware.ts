import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/error";

export class ErrorMiddleware {
  constructor(private environment: string) {}

  public handle = (
    error: any,
    _req: Request,
    res: Response,
    _next: NextFunction
  ): void => {
    console.error(error);

    const { statusCode, message } = this.resolve(error);

    res.status(statusCode).json({
      success: false,
      message,
      ...(error instanceof AppError && error.code ? { code: error.code } : {}),
      stack: this.environment === "development" ? error.stack : undefined,
    });
  };

  // Maps known library errors (Mongo, Mongoose, JWT) to proper client errors instead of 500s
  private resolve(error: any): { statusCode: number; message: string } {
    // Unique index violation, e.g. two concurrent sign-ups with the same email
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern ?? error.keyValue ?? {})[0];
      const message = field === "email" ? "User already exists" : "Resource already exists";
      return { statusCode: 409, message };
    }

    // Malformed ObjectId in params/body
    if (error?.name === "CastError") {
      return { statusCode: 400, message: `Invalid ${error.path ?? "id"}` };
    }

    if (error?.name === "ValidationError") {
      return { statusCode: 400, message: error.message };
    }

    // TokenExpiredError and NotBeforeError both extend JsonWebTokenError
    if (error instanceof jwt.TokenExpiredError) {
      return { statusCode: 401, message: "Session expired, please log in again" };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { statusCode: 401, message: "Invalid authentication token" };
    }

    return {
      statusCode: error?.statusCode || 500,
      message: error?.message || "Internal Server Error",
    };
  }
}
