export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    // Optional machine-readable code so clients can branch without parsing messages
    public code?: string
  ) {
    super(message);
  }
}

export class UserNotFoundError extends AppError {
  constructor() {
    super(404, "User not found");
  }
}

export class CourseNotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}

export class NotificationNotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
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

export class PasswordChangeRequiredError extends AppError {
  constructor() {
    super(403, "You must change your temporary password before continuing.", "PASSWORD_CHANGE_REQUIRED");
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor() {
    super(403, "Please verify your email address to continue.", "EMAIL_NOT_VERIFIED");
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string) {
    super(429, message);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class ModuleNotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}

export class EnrollmentNotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}

export class AlreadyEnrolledError extends AppError {
  constructor() {
    super(409, "Student is already enrolled in this course");
  }
}

export class CourseAccessDeniedError extends AppError {
  constructor(message: string = "You do not have access to this course") {
    super(403, message, "COURSE_ACCESS_DENIED");
  }
}

export class CourseAccessExpiredError extends AppError {
  constructor(expiredAt: Date) {
    super(403, `Your access to this course expired on ${expiredAt.toISOString()}`, "COURSE_ACCESS_EXPIRED");
  }
}

export class NoteNotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}
export class DiscussionNotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}
export class LessonNotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}
export class SubmissionNotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}
export class CertificateNotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}

export class BadgeNotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}
export class InvalidAssignmentLessonError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}

export class QuizNotFoundError extends AppError { 
   constructor(message: string) {
    super(404, message);
  }
 }
export class InvalidQuizLessonError extends AppError {
   constructor(message: string) {
    super(400, message);
  }
 }
export class AttemptNotFoundError extends AppError {
   constructor(message: string) {
    super(404, message);
  }
 }
export class AttemptAlreadyInProgressError extends AppError { 
   constructor(message: string) {
    super(400, message);
  }
}
export class AttemptAlreadySubmittedError extends AppError { 
   constructor(message: string) {
    super(400, message);
  }
}
export class InvalidAnswerFormatError extends AppError { 
   constructor(message: string) {
    super(400, message);
  }
}

// Upstream service (e.g. a payment provider) failed or could not be reached
export class ExternalServiceError extends AppError {
  constructor(
    message: string,
    // Status returned by the upstream service, if it responded at all
    public readonly upstreamStatus?: number,
    public readonly upstreamBody?: unknown
  ) {
    super(502, message, "EXTERNAL_SERVICE_ERROR");
  }
}

export class PaymentNotFoundError extends AppError {
  constructor(message: string = "Payment not found") {
    super(404, message);
  }
}

export class CourseNotAvailableError extends AppError {
  constructor(message: string = "This course is not open for applications") {
    super(400, message, "COURSE_NOT_AVAILABLE");
  }
}

export class CourseHasStudentsError extends AppError {
  constructor(count: number) {
    super(
      409,
      `This course cannot be deleted because ${count} student${count === 1 ? " is" : "s are"} linked to it`,
      "COURSE_HAS_STUDENTS"
    );
  }
}
