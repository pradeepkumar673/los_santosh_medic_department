import { Schema, model, Document, Types } from "mongoose";

export type TriageSeverity = "critical" | "urgent" | "moderate" | "low";

interface IVitals {
  temperature?: number; // Celsius
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number; // bpm
  respiratoryRate?: number;
  oxygenSaturation?: number; // %
  bloodSugar?: number; // mg/dL
}

export interface IMedicalAssessment extends Document {
  patient: Types.ObjectId;
  appointment?: Types.ObjectId;
  assessedBy: Types.ObjectId; // nurse or doctor (User ref)
  vitals: IVitals;
  triageSeverity: TriageSeverity;
  chiefComplaint: string;
  symptoms: string[];
  diagnosis?: string;
  prescriptions: {
    medicineName: string;
    dosage: string;
    frequency: string;
    durationDays: number;
  }[];
  labTestsOrdered: string[];
  followUpRequired: boolean;
  followUpDate?: Date;
  notes?: string;
  attachments: string[]; // file URLs
  createdAt: Date;
  updatedAt: Date;
}

const vitalsSchema = new Schema<IVitals>(
  {
    temperature: { type: Number, min: 30, max: 45 },
    bloodPressureSystolic: { type: Number, min: 50, max: 300 },
    bloodPressureDiastolic: { type: Number, min: 30, max: 200 },
    heartRate: { type: Number, min: 20, max: 300 },
    respiratoryRate: { type: Number, min: 5, max: 80 },
    oxygenSaturation: { type: Number, min: 0, max: 100 },
    bloodSugar: { type: Number, min: 0, max: 1000 },
  },
  { _id: false }
);

const prescriptionSchema = new Schema(
  {
    medicineName: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    frequency: { type: String, required: true, trim: true },
    durationDays: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const medicalAssessmentSchema = new Schema<IMedicalAssessment>(
  {
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    assessedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vitals: {
      type: vitalsSchema,
      default: {},
    },
    triageSeverity: {
      type: String,
      enum: ["critical", "urgent", "moderate", "low"],
      default: "moderate",
    },
    chiefComplaint: {
      type: String,
      required: [true, "Chief complaint is required"],
      trim: true,
      maxlength: 500,
    },
    symptoms: {
      type: [String],
      default: [],
    },
    diagnosis: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    prescriptions: {
      type: [prescriptionSchema],
      default: [],
    },
    labTestsOrdered: {
      type: [String],
      default: [],
    },
    followUpRequired: {
      type: Boolean,
      default: false,
    },
    followUpDate: {
      type: Date,
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    attachments: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

medicalAssessmentSchema.index({ patient: 1, createdAt: -1 });
medicalAssessmentSchema.index({ appointment: 1 });
medicalAssessmentSchema.index({ triageSeverity: 1 });

export default model<IMedicalAssessment>(
  "MedicalAssessment",
  medicalAssessmentSchema
);
