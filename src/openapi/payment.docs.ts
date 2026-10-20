// src/openapi/payment.docs.ts
import { z } from "zod";
import { registry, bearerAuth, successEnvelope, errorResponses, jsonContent, pick, ErrorResponseSchema } from "./registry";
import { verifyPaymentQuerySchema } from "../validators/payment.validator";
import { Currency, EnrollmentStatus } from "../models/course.model";
import { PaymentStatus } from "../models/payment.model";

const CourseIdParam = z.object({ courseId: z.string().openapi({ example: "665f1c2e8b3e4a0012ab34cd" }) });

// Mirrors IPayment in models/payment.model.ts
const PaymentSchema = registry.register(
  "Payment",
  z.object({
    _id: z.string(),
    student: z.string(),
    course: z.string(),
    txRef: z.string().openapi({ example: "PALMS-3f0f5c2e-8a51-4d4e-9b3a-2c1d0e6f7a8b" }),
    amount: z.number().openapi({ description: "Course price at the time of applying, in naira", example: 25000 }),
    currency: z.enum(Currency),
    provider: z.literal("flutterwave"),
    status: z.enum(PaymentStatus),
    paymentLink: z.string().optional(),
    transactionId: z.string().optional(),
    flwRef: z.string().optional(),
    amountPaid: z.number().optional(),
    paymentType: z.string().optional(),
    paidAt: z.string().datetime().optional(),
    failureReason: z.string().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
);

const EnrollmentSchema = z.object({
  _id: z.string(),
  student: z.string(),
  course: z.string(),
  enrolledAt: z.string().datetime(),
  enrolledBy: z.string(),
  accessStartsAt: z.string().datetime(),
  accessExpiresAt: z.string().datetime().nullable(),
  progress: z.number(),
  status: z.enum(EnrollmentStatus),
});

export function registerPaymentDocs(): void {
  registry.registerPath({
    method: "post",
    path: "/courses/{courseId}/apply",
    tags: ["Payments"],
    summary: "Apply for a course (student)",
    description:
      "For a paid course, creates a pending payment and returns a Flutterwave checkout `paymentLink`; send the student there. " +
      "After checkout Flutterwave redirects to `GET /payments/verify`, which enrolls the student once the payment is confirmed. " +
      "For a free course (price 0) the student is enrolled immediately and `enrollment` is returned instead. " +
      "Only published courses accept applications (400 with `code: COURSE_NOT_AVAILABLE` otherwise).",
    security: [{ [bearerAuth.name]: [] }],
    request: { params: CourseIdParam },
    responses: {
      201: successEnvelope(
        z.object({
          paymentLink: z.string().nullable().openapi({ example: "https://checkout.flutterwave.com/v3/hosted/pay/abc123" }),
          txRef: z.string().nullable(),
          amount: z.number(),
          currency: z.enum(Currency),
          enrollment: EnrollmentSchema.nullable(),
        }),
        "Checkout created (paid course) or student enrolled (free course)"
      ),
      ...pick(errorResponses, 400, 401, 403, 404, 409),
      502: jsonContent(ErrorResponseSchema, "Flutterwave could not be reached or rejected the request (code EXTERNAL_SERVICE_ERROR)"),
    },
  });

  registry.registerPath({
    method: "get",
    path: "/payments/verify",
    tags: ["Payments"],
    summary: "Verify a Flutterwave payment (callback URL)",
    description:
      "Flutterwave's `redirect_url`, so it needs no authentication. The transaction is always re-verified with Flutterwave " +
      "(reference, currency and amount must match) before the student is enrolled. Safe to call more than once: " +
      "an already settled payment just returns its current state.",
    request: { query: verifyPaymentQuerySchema },
    responses: {
      200: successEnvelope(
        z.object({ payment: PaymentSchema, enrollment: EnrollmentSchema.nullable() }),
        "Payment state after verification; `enrollment` is set once the payment succeeded"
      ),
      ...pick(errorResponses, 400, 404),
      502: jsonContent(ErrorResponseSchema, "Flutterwave could not be reached (code EXTERNAL_SERVICE_ERROR)"),
    },
  });
}
