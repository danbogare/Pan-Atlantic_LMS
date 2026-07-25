// src/openapi/document.ts
import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import type { OpenAPIObject } from "openapi3-ts/oas31";
import { registry } from "./registry";
import { registerCourseDocs } from "./course.docs";
import { registerAuthDocs } from "./auth.docs";
import { registerAdminDocs } from "./admin.docs";

let cached: OpenAPIObject | null = null;

export function getOpenApiDocument(): OpenAPIObject {
  if (cached) return cached;

  registerAuthDocs();
  registerCourseDocs();
  registerAdminDocs();

  const generator = new OpenApiGeneratorV31(registry.definitions);

  cached = generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "LMS API",
      version: "1.0.0",
      description: "Auto-generated from Zod validators.",
    },
    // TODO: confirm this matches your actual app.use(...) prefixes once
    // you tell me them — right now course/auth/admin paths in the *.docs.ts
    // files are written as if they're all mounted at the app root.
    servers: [{ url: "/api/v1", description: "Current environment" }],
  });

  return cached;
}