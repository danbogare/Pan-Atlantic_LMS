import { Request, Response, NextFunction } from "express";
import {
  UnauthorizedError,
  ForbiddenError,
  AccountDisabledError,
  PasswordChangeRequiredError,
  EmailNotVerifiedError,
} from "../errors/error";
import { IAuthUserPayload, IUserAuthState } from "../interfaces/auth.interface";
import { ICryptoService } from "../services/crypto.service";
import { IUserRepository } from "../repositories/user.repository";
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
  // Same as requireAuth but lets users with a pending temporary password through (e.g. to change it)
  requireAuthAllowPasswordChange: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;
  requireAdmin: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;
  requireInstructor: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;
}

export class AuthMiddleware implements IAuthMiddleware {
  constructor(
    private readonly cryptoService: ICryptoService,
    private readonly userRepository: IUserRepository
  ) {}

  public requireAuth = async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    const user = await this.authenticate(req);

    if (user.mustChangePassword) {
      throw new PasswordChangeRequiredError();
    }

    next();
  };

  public requireAuthAllowPasswordChange = async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    await this.authenticate(req);
    next();
  };

  public requireAdmin = async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (req.user?.role !== UserRole.ADMIN) {
      throw new ForbiddenError();
    }

    next();
  };

  public requireInstructor = async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    const allowedRoles = [UserRole.INSTRUCTOR, UserRole.ADMIN];
    if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError();
    }

    next();
  };

  // Verifies the bearer token and loads the user's current state, so deactivation and
  // role changes take effect immediately instead of when the token expires.
  private async authenticate(req: Request): Promise<IUserAuthState> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError();
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new UnauthorizedError();
    }

    // Invalid/expired tokens throw JWT errors, mapped to 401 by the error middleware
    const decoded = this.cryptoService.verifyToken(token);

    const user = await this.userRepository.findAuthStateById(decoded.id);
    if (!user) {
      throw new UnauthorizedError();
    }

    if (!user.isActive) {
      throw new AccountDisabledError();
    }

    // Unverified accounts are never issued tokens; this guards against any that slip through
    if (user.emailVerified === false) {
      throw new EmailNotVerifiedError();
    }

    req.user = {
      id: decoded.id,
      email: user.email,
      role: user.role,
    };

    return user;
  }
}
