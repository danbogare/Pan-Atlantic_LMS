// src/openapi/document.ts
import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import type { OpenAPIObject } from "openapi3-ts/oas31";
import { registry } from "./registry";
import { registerCourseDocs } from "./course.docs";
import { registerAuthDocs } from "./auth.docs";
import { registerAdminDocs } from "./admin.docs";
import { registerBadgeDocs } from "./badge.docs";
import { registerCertificateDocs } from "./certificate.docs";
import { registerDiscussionDocs } from "./discussion.docs";
import { registerNoteDocs } from "./note.docs";
import { registerStatsDocs } from "./stats.docs";
import { registerAssignmentDocs } from "./assignment.docs";
import { registerProgressDocs } from "./progress.docs";
import { registerQuizDocs } from "./quiz.docs";

let cached: OpenAPIObject | null = null;

export function getOpenApiDocument(): OpenAPIObject {
  if (cached) return cached;

  registerAuthDocs();
  registerCourseDocs();
  registerAdminDocs();
  registerStatsDocs();
  registerAssignmentDocs();
  registerDiscussionDocs();
  registerNoteDocs();
  registerCertificateDocs();
  registerBadgeDocs();
  registerProgressDocs();
  registerQuizDocs();

  const generator = new OpenApiGeneratorV31(registry.definitions);

  cached = generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "LMS API",
      version: "1.0.0",
      description: [
        "Auto-generated from Zod validators.",
        "",
        "**Authentication:** send `Authorization: Bearer <accessToken>` from `/auth/login`. Invalid or expired tokens return 401.",
        "",
        "**Temporary passwords:** users onboarded by an admin log in with a temporary password and have `mustChangePassword: true`. " +
          "Until they call `POST /auth/password/change`, every other authenticated endpoint returns 403 with `code: \"PASSWORD_CHANGE_REQUIRED\"`. " +
          "The same access token keeps working after the change.",
        "",
        "**Deactivated accounts** receive 403 on login and on every authenticated request.",
        "",
        "**Rate limits:** login and password-reset endpoints return 429 when limits are exceeded.",
        "",
        "**Course access:** admins can access every course; instructors only courses they are assigned to; students only courses " +
          "they are enrolled in and whose access has not expired. A course's `duration` is an access period in days that starts " +
          "at midnight (Africa/Lagos) the day after enrollment; `0` means it never expires. Otherwise course endpoints return 403 " +
          "with `code` `COURSE_ACCESS_DENIED` or `COURSE_ACCESS_EXPIRED`. After expiry students keep their certificates, progress " +
          "history and their own notes.",
        "",
        "**Public catalog:** `/public/courses` needs no authentication and lists published courses only.",
      ].join("\n"),
    },
    // TODO: confirm this matches your actual app.use(...) prefixes once
    // you tell me them — right now course/auth/admin paths in the *.docs.ts
    // files are written as if they're all mounted at the app root.
    servers: [{ url: "/api/v1", description: "Current environment" }],
  });

  return cached;
}