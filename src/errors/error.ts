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
    super(404, "User not found");
  }
}

export class UserExistsError extends AppError {
  constructor() {
    super(404, "User already found");
  }
}