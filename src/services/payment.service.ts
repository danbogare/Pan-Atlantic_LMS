// services/payment.service.ts
import { randomUUID } from "crypto";
import { Types } from "mongoose";
import { ICourseRepository } from "../repositories/course.repository";
import { IUserRepository } from "../repositories/user.repository";
import { IPaymentRepository } from "../repositories/payment.repository";
import { IFlutterwaveService } from "./flutterwave.service";
import {
  AlreadyEnrolledError,
  BadRequestError,
  CourseNotAvailableError,
  CourseNotFoundError,
  CourseTypeNotAllowedError,
  PaymentNotFoundError,
} from "../errors/error";
import { CourseStatus, CourseType, ICourse, IEnrollment } from "../models/course.model";
import { IPayment, PaymentStatus } from "../models/payment.model";
import { UserRole } from "../models/user.model";
import { IAuthUserPayload } from "../interfaces/auth.interface";
import {
  CourseApplicationResult,
  FlutterwaveTransaction,
  PaymentVerificationResult,
  VerifyPaymentQuery,
} from "../interfaces/payment.interface";
import { computeAccessWindow } from "../utils/course-access";

const TX_REF_PREFIX = "PALMS";
// Flutterwave may report amounts as floats, so compare with a sub-kobo tolerance
const AMOUNT_TOLERANCE = 0.001;

export interface IPaymentService {
  // Paid course: creates a pending payment and returns the Flutterwave checkout link.
  // Free course: enrolls the student immediately.
  applyForCourse(studentId: string, courseId: string): Promise<CourseApplicationResult>;
  // Flutterwave redirect (callback) target: confirms the transaction with Flutterwave and enrolls the student
  verifyPayment(query: VerifyPaymentQuery): Promise<PaymentVerificationResult>;
  // Payment status for the frontend after the redirect. Students only see their own payments;
  // a payment still pending is re-checked with Flutterwave first.
  getPaymentByTxRef(txRef: string, user: IAuthUserPayload): Promise<PaymentVerificationResult>;
}

export class PaymentService implements IPaymentService {
  constructor(
    private readonly paymentRepo: IPaymentRepository,
    private readonly courseRepo: ICourseRepository,
    private readonly userRepo: IUserRepository,
    private readonly flutterwaveService: IFlutterwaveService,
    // Absolute URL Flutterwave redirects the student to after checkout
    private readonly callbackUrl: string
  ) {}

  public async applyForCourse(studentId: string, courseId: string): Promise<CourseApplicationResult> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) {
      throw new CourseNotFoundError(`Course ${courseId} not found`);
    }
    if (course.status !== CourseStatus.PUBLISHED) {
      throw new CourseNotAvailableError();
    }
    if (course.courseType !== CourseType.PROFESSIONAL) {
      throw new CourseTypeNotAllowedError("Only professional courses can be applied for; academic enrollment is done by an admin");
    }

    const student = await this.userRepo.findById(studentId);
    if (!student || student.role !== UserRole.STUDENT) {
      throw new BadRequestError("Only students can apply for a course");
    }

    if (await this.courseRepo.findEnrollment(studentId, courseId)) {
      throw new AlreadyEnrolledError();
    }

    if (course.price <= 0) {
      const enrollment = await this.enroll(course, studentId);
      return { paymentLink: null, txRef: null, amount: 0, currency: course.currency, enrollment };
    }

    const txRef = `${TX_REF_PREFIX}-${randomUUID()}`;
    const payment = await this.paymentRepo.create({
      student: new Types.ObjectId(studentId),
      course: new Types.ObjectId(courseId),
      txRef,
      amount: course.price,
      currency: course.currency,
    });

    let paymentLink: string;
    try {
      paymentLink = await this.flutterwaveService.initializePayment({
        tx_ref: txRef,
        amount: course.price,
        currency: course.currency,
        redirect_url: this.callbackUrl,
        customer: {
          email: student.email,
          name: `${student.firstName} ${student.lastName}`,
        },
        customizations: {
          title: "Pan-Atlantic LMS",
          description: `Payment for ${course.title}`,
        },
        meta: { studentId, courseId },
      });
    } catch (error) {
      await this.paymentRepo.update(payment._id.toString(), {
        status: PaymentStatus.FAILED,
        failureReason: error instanceof Error ? error.message : "Could not initialize payment",
      });
      throw error;
    }

    await this.paymentRepo.update(payment._id.toString(), { paymentLink });

    return { paymentLink, txRef, amount: course.price, currency: course.currency, enrollment: null };
  }

  public async verifyPayment(query: VerifyPaymentQuery): Promise<PaymentVerificationResult> {
    const payment = await this.paymentRepo.findByTxRef(query.tx_ref);
    if (!payment) {
      throw new PaymentNotFoundError();
    }

    // Already handled (e.g. the student refreshed the callback page)
    if (payment.status !== PaymentStatus.PENDING) {
      return { payment, enrollment: await this.findEnrollment(payment) };
    }

    // A cancelled checkout has no transaction to verify
    if (query.status === "cancelled" && !query.transaction_id) {
      const cancelled = await this.paymentRepo.settlePending(payment.txRef, {
        status: PaymentStatus.CANCELLED,
        failureReason: "Payment was cancelled by the customer",
      });
      return this.resultFor(cancelled, payment);
    }

    // Never trust the redirect's query string: ask Flutterwave what actually happened
    const transaction = query.transaction_id
      ? await this.flutterwaveService.verifyTransaction(query.transaction_id)
      : await this.flutterwaveService.verifyTransactionByReference(payment.txRef);

    // Nothing paid yet (checkout abandoned or still open); leave it pending so it can be verified later
    if (!transaction) {
      return { payment, enrollment: null };
    }

    const mismatch = this.findMismatch(payment, transaction);
    if (mismatch) {
      const failed = await this.paymentRepo.settlePending(payment.txRef, {
        status: PaymentStatus.FAILED,
        transactionId: String(transaction.id),
        flwRef: transaction.flw_ref,
        amountPaid: transaction.amount,
        failureReason: mismatch,
      });
      return this.resultFor(failed, payment);
    }

    if (transaction.status === "pending") {
      return { payment, enrollment: null };
    }

    if (transaction.status !== "successful") {
      const failed = await this.paymentRepo.settlePending(payment.txRef, {
        status: PaymentStatus.FAILED,
        transactionId: String(transaction.id),
        flwRef: transaction.flw_ref,
        failureReason: `Flutterwave reported the transaction as ${transaction.status}`,
      });
      return this.resultFor(failed, payment);
    }

    const successful = await this.paymentRepo.settlePending(payment.txRef, {
      status: PaymentStatus.SUCCESSFUL,
      transactionId: String(transaction.id),
      flwRef: transaction.flw_ref,
      amountPaid: transaction.amount,
      paymentType: transaction.payment_type,
      paidAt: new Date(),
    });

    // Another request settled it first and is (or was) doing the enrollment
    if (!successful) {
      return this.resultFor(null, payment);
    }

    const course = await this.courseRepo.findById(successful.course.toString());
    if (!course) {
      // Paid, but the course was removed in the meantime; the payment record stays for a refund
      throw new CourseNotFoundError("Payment was received but the course no longer exists, please contact support");
    }

    const enrollment = await this.enroll(course, successful.student.toString());
    return { payment: successful, enrollment };
  }

  public async getPaymentByTxRef(txRef: string, user: IAuthUserPayload): Promise<PaymentVerificationResult> {
    const payment = await this.paymentRepo.findByTxRef(txRef);
    // Same 404 for someone else's payment, so references can't be probed
    if (!payment || (user.role !== UserRole.ADMIN && payment.student.toString() !== user.id)) {
      throw new PaymentNotFoundError();
    }

    if (payment.status === PaymentStatus.PENDING) {
      // Best effort: if Flutterwave is unreachable, still report the stored (pending) state
      await this.verifyPayment({ tx_ref: txRef }).catch((error) => console.error(error));
    }

    const latest = (await this.paymentRepo.findByTxRefWithCourse(txRef)) ?? payment;
    // Look up the enrollment with the unpopulated ids; `latest.course` is a populated document
    const enrollment = latest.status === PaymentStatus.SUCCESSFUL
      ? await this.courseRepo.findEnrollment(payment.student.toString(), payment.course.toString())
      : null;
    return { payment: latest, enrollment };
  }

  // Returns a reason when the transaction doesn't belong to this payment or wasn't paid in full
  private findMismatch(payment: IPayment, transaction: FlutterwaveTransaction): string | null {
    if (transaction.tx_ref !== payment.txRef) {
      return "Transaction reference does not match this payment";
    }
    if (transaction.currency !== payment.currency) {
      return `Expected currency ${payment.currency} but received ${transaction.currency}`;
    }
    if (transaction.status === "successful" && transaction.amount + AMOUNT_TOLERANCE < payment.amount) {
      return `Expected ${payment.amount} but received ${transaction.amount}`;
    }
    return null;
  }

  // Result after a settlePending call; null means a concurrent request settled it, so reload the latest state
  private async resultFor(settled: IPayment | null, original: IPayment): Promise<PaymentVerificationResult> {
    const payment = settled ?? (await this.paymentRepo.findByTxRef(original.txRef)) ?? original;
    return { payment, enrollment: await this.findEnrollment(payment) };
  }

  private async findEnrollment(payment: IPayment): Promise<IEnrollment | null> {
    if (payment.status !== PaymentStatus.SUCCESSFUL) return null;
    return await this.courseRepo.findEnrollment(payment.student.toString(), payment.course.toString());
  }

  // Self-enrollment: the student is recorded as enrolledBy. Safe to call twice for the same student/course.
  private async enroll(course: ICourse, studentId: string): Promise<IEnrollment> {
    const courseId = course._id.toString();
    const existing = await this.courseRepo.findEnrollment(studentId, courseId);
    if (existing) return existing;

    try {
      return await this.courseRepo.enrollStudent({
        student: new Types.ObjectId(studentId),
        course: new Types.ObjectId(courseId),
        enrolledBy: new Types.ObjectId(studentId),
        ...computeAccessWindow(course.duration ?? 0),
      });
    } catch (error: any) {
      // Lost a race with a concurrent enrollment (unique student+course index)
      const enrollment = error?.code === 11000 ? await this.courseRepo.findEnrollment(studentId, courseId) : null;
      if (enrollment) return enrollment;
      throw error;
    }
  }
}
