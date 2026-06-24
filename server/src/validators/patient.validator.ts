import { z } from "zod";
import { objectId, paginationQuery } from "./common";

const emergencyContactSchema = z.object({
  name: z.string().min(2).max(100),
  relation: z.string().min(2).max(50),
  phone: z.string().regex(/^[0-9]{10}$/, "Phone must be a 10-digit number"),
});

const addressSchema = z.object({
  line1: z.string().min(3).max(200),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().regex(/^[0-9]{6}$/, "Pincode must be 6 digits"),
});

export const createPatientSchema = z.object({
  body: z.object({
    user: objectId.optional(), // optional if created alongside a new User
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().regex(/^[0-9]{10}$/).optional(),
    dateOfBirth: z.coerce.date().refine((d) => d < new Date(), {
      message: "Date of birth must be in the past",
    }),
    gender: z.enum(["male", "female", "other"]),
    bloodGroup: z
      .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"])
      .optional()
      .default("unknown"),
    height: z.number().min(30).max(300).optional(),
    weight: z.number().min(1).max(500).optional(),
    allergies: z.array(z.string()).optional().default([]),
    chronicConditions: z.array(z.string()).optional().default([]),
    currentMedications: z.array(z.string()).optional().default([]),
    emergencyContact: emergencyContactSchema,
    address: addressSchema,
    insuranceProvider: z.string().optional(),
    insurancePolicyNumber: z.string().optional(),
    abhaId: z.string().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updatePatientSchema = z.object({
  body: createPatientSchema.shape.body.partial(),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export const getPatientByIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export const listPatientsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: paginationQuery.extend({
    search: z.string().optional(),
    city: z.string().optional(),
    bloodGroup: z.string().optional(),
  }),
});
