class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export class UserNotFoundError extends AppError {
  constructor() {
    super(400, "User not found");
  }
}

export class UserExistsError extends AppError {
  constructor() {
    super(409, "User already exists");
  }
}

export class OTPExistsError extends AppError {
  constructor() {
    super(409, "OTP already generated, check email");
  }
}

export class InvalidRequestError extends AppError {
  constructor() {
    super(400, "invalid request");
  }
}

export class InvalidCredentialError extends AppError {
  constructor() {
    super(400, "invalid credentials");
  }
}

export class AccountDisabledError extends AppError {
  constructor() {
    super(403, "Your account has been deactivated. Please contact support.");
  }
}

export class OTPExpiredError extends AppError {
  constructor() {
    super(400, "The verification code has expired. Please request a new one.");
  }
}
export class InvalidOTPError extends AppError {
  constructor() {
    super(400, "invalid OTP");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "You do not have permission to perform this action") {
    super(403, message);
  }
}