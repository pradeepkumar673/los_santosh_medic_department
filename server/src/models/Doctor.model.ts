import { Schema, model, Document, Types } from "mongoose";

export type DoctorAvailabilityStatus =
  | "available"
  | "busy"
  | "on_break"
  | "off_duty";

interface IWorkingHours {
  day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  startTime: string; // "09:00"
  endTime: string; // "17:00"
}

export interface IDoctor extends Document {
  user: Types.ObjectId;
  department: Types.ObjectId;
  specialization: string;
  qualifications: string[];
  licenseNumber: string;
  experienceYears: number;
  consultationFee: number;
  availabilityStatus: DoctorAvailabilityStatus;
  workingHours: IWorkingHours[];
  maxPatientsPerDay: number;
  rating: number;
  ratingCount: number;
  isOnLeave: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const workingHoursSchema = new Schema<IWorkingHours>(
  {
    day: {
      type: String,
      enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      required: true,
    },
    startTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"],
    },
    endTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"],
    },
  },
  { _id: false }
);

const doctorSchema = new Schema<IDoctor>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required"],
    },
    specialization: {
      type: String,
      required: [true, "Specialization is required"],
      trim: true,
    },
    qualifications: {
      type: [String],
      default: [],
    },
    licenseNumber: {
      type: String,
      required: [true, "License number is required"],
      unique: true,
      trim: true,
    },
    experienceYears: {
      type: Number,
      min: 0,
      max: 70,
      default: 0,
    },
    consultationFee: {
      type: Number,
      required: true,
      min: [0, "Consultation fee cannot be negative"],
    },
    availabilityStatus: {
      type: String,
      enum: ["available", "busy", "on_break", "off_duty"],
      default: "off_duty",
    },
    workingHours: {
      type: [workingHoursSchema],
      default: [],
    },
    maxPatientsPerDay: {
      type: Number,
      default: 30,
      min: 1,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    isOnLeave: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

doctorSchema.index({ user: 1 }, { unique: true });
doctorSchema.index({ licenseNumber: 1 }, { unique: true });
doctorSchema.index({ department: 1 });
doctorSchema.index({ availabilityStatus: 1 });

export default model<IDoctor>("Doctor", doctorSchema);
