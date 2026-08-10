import { z } from "zod";
import "../openapi/registry";
import { requiredTitle } from "./common.validator";

export const createDiscussionSchema = z.object({
  title: requiredTitle("Discussion title"),
  body: z
    .string({ error: "Discussion body is required" })
    .trim()
    .min(1, { error: "Body cannot be empty" })
    .openapi({ example: "Can someone explain how useEffect cleanup works?" }),
});

export type CreateDiscussionInput = z.infer<typeof createDiscussionSchema>;

export const createReplySchema = z.object({
  body: z
    .string({ error: "Reply body is required" })
    .trim()
    .min(1, { error: "Reply cannot be empty" })
    .openapi({ example: "It runs before the next effect and on unmount." }),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;