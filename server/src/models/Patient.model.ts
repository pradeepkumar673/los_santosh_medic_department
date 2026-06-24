import { Schema, model, Document, Types } from "mongoose";

export type BloodGroup =
  | "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "unknown";

interface IEmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface IPatient extends Document {
  user: Types.ObjectId;
  dateOfBirth: Date;
  gender: "male" | "female" | "other";
  bloodGroup: BloodGroup;
  height?: number; // cm
  weight?: number; // kg
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  emergencyContact: IEmergencyContact;
  address: {
    line1: string;
    city: string;
    state: string;
    pincode: string;
  };
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  abhaId?: string; // Ayushman Bharat Health Account (India)
  createdAt: Date;
  updatedAt: Date;
}

const emergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, required: true, trim: true },
    relation: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      match: [/^[0-9]{10}$/, "Emergency contact phone must be 10 digits"],
    },
  },
  { _id: false }
);

const patientSchema = new Schema<IPatient>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
      validate: {
        validator: (v: Date) => v < new Date(),
        message: "Date of birth must be in the past",
      },
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"],
      default: "unknown",
    },
    height: {
      type: Number,
      min: [30, "Height value seems invalid"],
      max: [300, "Height value seems invalid"],
    },
    weight: {
      type: Number,
      min: [1, "Weight value seems invalid"],
      max: [500, "Weight value seems invalid"],
    },
    allergies: {
      type: [String],
      default: [],
    },
    chronicConditions: {
      type: [String],
      default: [],
    },
    currentMedications: {
      type: [String],
      default: [],
    },
    emergencyContact: {
      type: emergencyContactSchema,
      required: true,
    },
    address: {
      line1: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pincode: {
        type: String,
        required: true,
        match: [/^[0-9]{6}$/, "Pincode must be 6 digits"],
      },
    },
    insuranceProvider: {
      type: String,
      trim: true,
    },
    insurancePolicyNumber: {
      type: String,
      trim: true,
    },
    abhaId: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
  },
  { timestamps: true }
);

patientSchema.index({ user: 1 }, { unique: true });
patientSchema.index({ abhaId: 1 }, { unique: true, sparse: true });
patientSchema.index({ "address.city": 1 });

export default model<IPatient>("Patient", patientSchema);
