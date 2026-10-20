import { z } from "zod";
import "../openapi/registry";

// Query string Flutterwave appends when redirecting the student back to the callback URL
export const verifyPaymentQuerySchema = z.object({
  tx_ref: z
    .string({ error: "tx_ref is required" })
    .trim()
    .min(1, { error: "tx_ref cannot be empty" })
    .max(100, { error: "tx_ref is too long" })
    .openapi({ example: "PALMS-3f0f5c2e-8a51-4d4e-9b3a-2c1d0e6f7a8b" }),

  transaction_id: z
    .string()
    .trim()
    .regex(/^\d+$/, { error: "transaction_id must be numeric" })
    .optional()
    .openapi({ example: "4975443", description: "Absent when the checkout was cancelled" }),

  status: z
    .string()
    .trim()
    .optional()
    .openapi({
      example: "successful",
      description: "Status reported on the redirect (successful, cancelled, failed). Informational only; the payment is always re-verified with Flutterwave.",
    }),
});

export type VerifyPaymentQueryInput = z.infer<typeof verifyPaymentQuerySchema>;
