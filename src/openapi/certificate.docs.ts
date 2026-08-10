import { z } from "zod";
import { registry, bearerAuth, successEnvelope, errorResponses, pick } from "./registry";

const CertificateNumberParam = z.object({
  certificateNumber: z.string().openapi({ example: "b3f1c9a2-..." }),
});

const CertificateSchema = registry.register(
  "Certificate",
  z.object({
    id: z.string(),
    student: z.string(),
    course: z.string(),
    certificateNumber: z.string(),
    issuedAt: z.string().datetime(),
  })
);

export function registerCertificateDocs() {
  registry.registerPath({
    method: "get",
    path: "/student/certificates",
    tags: ["Certificates"],
    summary: "List the current student's certificates",
    security: [{ [bearerAuth.name]: [] }],
    responses: { 200: successEnvelope(z.array(CertificateSchema), "Student certificates"), ...pick(errorResponses, 401) },
  });

  registry.registerPath({
    method: "get",
    path: "/certificates/verify/{certificateNumber}",
    tags: ["Certificates"],
    summary: "Publicly verify a certificate by its number",
    request: { params: CertificateNumberParam },
    responses: { 200: successEnvelope(CertificateSchema, "Certificate is valid"), ...pick(errorResponses, 404) },
  });
}