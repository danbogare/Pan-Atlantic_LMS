import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../errors/error"; 
import { IAuthUserPayload } from "../interfaces/auth.interface";
import { ICryptoService } from "../services/crypto.service";
import { UserRole } from "../models/user.model";

declare global {
  namespace Express {
    interface Request {
      user?: IAuthUserPayload;
    }
  }
}

export interface IAuthMiddleware {
  requireAuth: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;
  requireAdmin: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;
}

export class AuthMiddleware implements IAuthMiddleware {
  constructor(private readonly cryptoService: ICryptoService) {}

  public requireAuth = async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError();
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new UnauthorizedError();
    }

    // If verifyToken fails or expires, it bubbles up naturally
    const decoded = this.cryptoService.verifyToken(token);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  };
  
  public requireAdmin = async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (req.user?.role !== UserRole.ADMIN) {
      throw new UnauthorizedError();
    }

    next();
  };
}