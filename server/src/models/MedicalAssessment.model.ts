import { Schema, model, Document, Types } from "mongoose";

export type TriageSeverity = "critical" | "urgent" | "moderate" | "low";
export type AssessmentStatus = "pending_booking" | "booked" | "in_progress" | "completed";

// ── Vitals sub-document ───────────────────────────────────────────────────────
export interface IVitals {
  temperature?: number;           // °C
  bloodPressureSystolic?: number; // mmHg
  bloodPressureDiastolic?: number;
  heartRate?: number;             // bpm
  respiratoryRate?: number;       // breaths/min
  oxygenSaturation?: number;      // %SpO₂
  bloodSugar?: number;            // mg/dL
}

// ── Triage breakdown — one entry per scoring rule that fired ─────────────────
export interface ITriageRuleFired {
  rule: string;   // human-readable rule name, e.g. "Low SpO₂"
  points: number; // contribution to total score
}

// ── Prescription sub-document ────────────────────────────────────────────────
export interface IPrescription {
  medicineName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
}

// ── Top-level document interface ─────────────────────────────────────────────
export interface IMedicalAssessment extends Document {
  patient: Types.ObjectId;
  appointment?: Types.ObjectId;
  assessedBy: Types.ObjectId;          // User ref (nurse / doctor / reception)

  // Triage
  triageSeverity: TriageSeverity;
  triageScore: number;                  // raw numeric score (0–100)
  triageBreakdown: ITriageRuleFired[];  // audit trail of every rule that fired
  triageOverriddenBy?: Types.ObjectId; // User who manually overrode the computed level
  triageOverrideReason?: string;

  // Clinical data
  chiefComplaint: string;
  symptoms: string[];
  vitals: IVitals;
  diagnosis?: string;
  prescriptions: IPrescription[];
  labTestsOrdered: string[];
  followUpRequired: boolean;
  followUpDate?: Date;
  notes?: string;
  attachments: string[];

  // Lifecycle
  assessmentStatus: AssessmentStatus;

  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-schemas ───────────────────────────────────────────────────────────────
const vitalsSchema = new Schema<IVitals>(
  {
    temperature:            { type: Number, min: 30,  max: 45  },
    bloodPressureSystolic:  { type: Number, min: 50,  max: 300 },
    bloodPressureDiastolic: { type: Number, min: 30,  max: 200 },
    heartRate:              { type: Number, min: 20,  max: 300 },
    respiratoryRate:        { type: Number, min: 5,   max: 80  },
    oxygenSaturation:       { type: Number, min: 0,   max: 100 },
    bloodSugar:             { type: Number, min: 0,   max: 1000},
  },
  { _id: false }
);

const triageRuleSchema = new Schema<ITriageRuleFired>(
  {
    rule:   { type: String, required: true },
    points: { type: Number, required: true },
  },
  { _id: false }
);

const prescriptionSchema = new Schema<IPrescription>(
  {
    medicineName: { type: String, required: true, trim: true },
    dosage:       { type: String, required: true, trim: true },
    frequency:    { type: String, required: true, trim: true },
    durationDays: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

// ── Main schema ───────────────────────────────────────────────────────────────
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
      default: null,
    },
    assessedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Triage
    triageSeverity: {
      type: String,
      enum: ["critical", "urgent", "moderate", "low"],
      required: true,
    },
    triageScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    triageBreakdown: {
      type: [triageRuleSchema],
      default: [],
    },
    triageOverriddenBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    triageOverrideReason: {
      type: String,
      maxlength: 300,
      trim: true,
    },

    // Clinical
    chiefComplaint: {
      type: String,
      required: [true, "Chief complaint is required"],
      trim: true,
      maxlength: 500,
    },
    symptoms: { type: [String], default: [] },
    vitals: { type: vitalsSchema, default: {} },
    diagnosis: { type: String, trim: true, maxlength: 1000 },
    prescriptions: { type: [prescriptionSchema], default: [] },
    labTestsOrdered: { type: [String], default: [] },
    followUpRequired: { type: Boolean, default: false },
    followUpDate: { type: Date },
    notes: { type: String, maxlength: 1000 },
    attachments: { type: [String], default: [] },

    // Lifecycle
    assessmentStatus: {
      type: String,
      enum: ["pending_booking", "booked", "in_progress", "completed"],
      default: "pending_booking",
    },
  },
  { timestamps: true }
);

medicalAssessmentSchema.index({ patient: 1, createdAt: -1 });
medicalAssessmentSchema.index({ appointment: 1 });
medicalAssessmentSchema.index({ triageSeverity: 1 });
medicalAssessmentSchema.index({ assessmentStatus: 1 });
medicalAssessmentSchema.index({ assessedBy: 1, createdAt: -1 });

export default model<IMedicalAssessment>("MedicalAssessment", medicalAssessmentSchema);
