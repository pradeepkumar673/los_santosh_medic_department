import { z } from "zod";
import { objectId, paginationQuery } from "./common";

export const bookAppointmentSchema = z.object({
  body: z.object({
    patient: objectId,
    doctor: objectId,
    department: objectId,
    appointmentType: z
      .enum(["walk_in", "scheduled", "emergency", "follow_up"])
      .default("scheduled"),
    scheduledDate: z.coerce.date().refine((d) => d >= new Date(new Date().setHours(0, 0, 0, 0)), {
      message: "Scheduled date cannot be in the past",
    }),
    scheduledTimeSlot: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time slot format (HH:mm)")
      .optional(),
    reasonForVisit: z.string().trim().min(3).max(500),
    symptoms: z.array(z.string()).optional().default([]),
    notes: z.string().max(1000).optional(),
    priority: z.enum(["emergency", "high", "normal", "low"]).optional().default("normal"),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateAppointmentStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      "scheduled",
      "confirmed",
      "checked_in",
      "in_progress",
      "completed",
      "cancelled",
      "no_show",
    ]),
    cancellationReason: z.string().max(300).optional(),
  }),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export const listAppointmentsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: paginationQuery.extend({
    patient: objectId.optional(),
    doctor: objectId.optional(),
    department: objectId.optional(),
    status: z
      .enum(["scheduled", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"])
      .optional(),
    date: z.coerce.date().optional(),
  }),
});

export const getAppointmentByIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>["body"];
