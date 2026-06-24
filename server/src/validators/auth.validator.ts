import { z } from "zod";

const phoneRegex = /^[0-9]{10}$/;
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const baseRegisterSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email("Invalid email format"),
  phone: z.string().regex(phoneRegex, "Phone must be a 10-digit number"),
  password: passwordSchema,
});

// Patient self-registration — includes patient profile fields
export const registerPatientSchema = baseRegisterSchema.extend({
  role: z.literal("patient"),
  dateOfBirth: z.coerce.date().refine((d) => d < new Date(), {
    message: "Date of birth must be in the past",
  }),
  gender: z.enum(["male", "female", "other"]),
  bloodGroup: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"])
    .optional()
    .default("unknown"),
  emergencyContact: z.object({
    name: z.string().trim().min(2),
    relation: z.string().trim().min(2),
    phone: z.string().regex(phoneRegex, "Emergency contact phone must be 10 digits"),
  }),
  address: z.object({
    line1: z.string().trim().min(2),
    city: z.string().trim().min(2),
    state: z.string().trim().min(2),
    pincode: z.string().regex(/^[0-9]{6}$/, "Pincode must be 6 digits"),
  }),
});

// Staff registration (doctor/nurse/reception) — typically created by admin
export const registerStaffSchema = baseRegisterSchema.extend({
  role: z.enum(["doctor", "nurse", "reception"]),
  // Doctor-specific fields, optional unless role === "doctor" (checked in controller)
  department: z.string().optional(),
  specialization: z.string().optional(),
  licenseNumber: z.string().optional(),
  consultationFee: z.number().min(0).optional(),
});

// Admin registration — typically restricted/seeded, included for completeness
export const registerAdminSchema = baseRegisterSchema.extend({
  role: z.literal("admin"),
  adminInviteCode: z.string().min(1, "Admin invite code is required"),
});

export const registerSchema = z.discriminatedUnion("role", [
  registerPatientSchema,
  z.object({ role: z.literal("doctor") }).passthrough().merge(registerStaffSchema.omit({ role: true })).extend({ role: z.literal("doctor") }),
  z.object({ role: z.literal("nurse") }).passthrough().merge(registerStaffSchema.omit({ role: true })).extend({ role: z.literal("nurse") }),
  z.object({ role: z.literal("reception") }).passthrough().merge(registerStaffSchema.omit({ role: true })).extend({ role: z.literal("reception") }),
  registerAdminSchema,
]);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
