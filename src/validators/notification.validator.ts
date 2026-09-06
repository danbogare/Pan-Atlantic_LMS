import { z } from "zod";
import "../openapi/registry";
import { idField, requiredTitle, urlOrEmpty } from "./common.validator";
import { NotificationType } from "../models/notification.model";
import { UserRole } from "../models/user.model";

export const createNotificationSchema = z.object({
  recipientId: idField("Recipient ID"),
  title: requiredTitle("Notification title"),
  message: z
    .string({ error: "Message is required" })
    .trim()
    .min(1, { error: "Message cannot be empty" }),
  type: z.enum(NotificationType, { error: "Invalid notification type" }),
  actionUrl: urlOrEmpty,
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

export const broadcastNotificationSchema = z.object({
  title: requiredTitle("Notification title"),
  message: z
    .string({ error: "Message is required" })
    .trim()
    .min(1, { error: "Message cannot be empty" }),
  type: z.enum(NotificationType, { error: "Invalid notification type" }),
  targetRole: z.enum(UserRole, { error: "Invalid target role" }).optional(), // omitted = broadcast to everyone
  actionUrl: urlOrEmpty,
});

export type BroadcastNotificationInput = z.infer<typeof broadcastNotificationSchema>;