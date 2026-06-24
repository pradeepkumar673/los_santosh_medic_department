import { z } from "zod";
import { objectId, paginationQuery } from "./common";

const workingHourSchema = z.object({
  day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
});

export const createDoctorSchema = z.object({
  body: z.object({
    user: objectId.optional(),
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().regex(/^[0-9]{10}$/).optional(),
    department: objectId,
    specialization: z.string().min(2).max(100),
    qualifications: z.array(z.string()).optional().default([]),
    licenseNumber: z.string().min(3).max(50),
    experienceYears: z.number().int().min(0).max(70).optional().default(0),
    consultationFee: z.number().min(0),
    workingHours: z.array(workingHourSchema).optional().default([]),
    maxPatientsPerDay: z.number().int().min(1).optional().default(30),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateDoctorSchema = z.object({
  body: createDoctorSchema.shape.body.partial().extend({
    availabilityStatus: z.enum(["available", "busy", "on_break", "off_duty"]).optional(),
    isOnLeave: z.boolean().optional(),
  }),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export const getDoctorByIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export const listDoctorsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: paginationQuery.extend({
    specialization: z.string().optional(),
    department: objectId.optional(),
    availabilityStatus: z.enum(["available", "busy", "on_break", "off_duty"]).optional(),
  }),
});
