import { z } from "zod";
import { objectId, paginationQuery } from "./common";

export const createBedSchema = z.object({
  body: z.object({
    bedNumber: z.string().min(1).max(20),
    ward: z.string().min(1).max(100),
    floor: z.number().int().min(0),
    bedType: z.enum(["general", "icu", "emergency", "private", "pediatric", "maternity"]),
    department: objectId,
    pricePerDay: z.number().min(0),
    amenities: z.array(z.string()).optional().default([]),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateBedSchema = z.object({
  body: createBedSchema.shape.body.partial(),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export const updateBedStatusSchema = z.object({
  body: z
    .object({
      status: z.enum(["vacant", "occupied", "cleaning", "maintenance"]),
      currentPatient: objectId.optional(),
      expectedDischargeDate: z.coerce.date().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.status === "occupied" && !data.currentPatient) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["currentPatient"],
          message: "currentPatient is required when setting status to 'occupied'",
        });
      }
    }),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export const allocateBedSchema = z.object({
  body: z.object({
    patientId: objectId,
    expectedDischargeDate: z.coerce
      .date()
      .refine((d) => d > new Date(), { message: "Expected discharge date must be in the future" })
      .optional(),
    admissionReason: z.string().trim().min(3).max(500),
  }),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export const dischargeBedSchema = z.object({
  body: z.object({
    dischargeNotes: z.string().trim().max(1000).optional(),
    nextStatus: z
      .enum(["vacant", "cleaning", "maintenance"])
      .optional()
      .default("cleaning"),
  }),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export const getBedByIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export const listBedsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: paginationQuery.extend({
    status: z.enum(["vacant", "occupied", "cleaning", "maintenance"]).optional(),
    bedType: z.enum(["general", "icu", "emergency", "private", "pediatric", "maternity"]).optional(),
    department: objectId.optional(),
    ward: z.string().optional(),
    floor: z.coerce.number().int().min(0).optional(),
  }),
});

export const listAllocationsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: paginationQuery.extend({
    patient: objectId.optional(),
    department: objectId.optional(),
    bed: objectId.optional(),
    status: z.enum(["active", "discharged", "transferred"]).optional(),
  }),
});
