import { Schema, model, Document, Types } from "mongoose";

export type BedType = "general" | "icu" | "emergency" | "private" | "pediatric" | "maternity";
export type BedStatus = "vacant" | "occupied" | "cleaning" | "maintenance";

export interface IBed extends Document {
  bedNumber: string;
  ward: string;
  floor: number;
  bedType: BedType;
  status: BedStatus;
  department: Types.ObjectId;
  currentPatient?: Types.ObjectId;
  assignedAt?: Date;
  expectedDischargeDate?: Date;
  pricePerDay: number;
  amenities: string[];
  createdAt: Date;
  updatedAt: Date;
}

const bedSchema = new Schema<IBed>(
  {
    bedNumber: {
      type: String,
      required: [true, "Bed number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    ward: {
      type: String,
      required: [true, "Ward is required"],
      trim: true,
    },
    floor: {
      type: Number,
      required: true,
      min: 0,
    },
    bedType: {
      type: String,
      enum: ["general", "icu", "emergency", "private", "pediatric", "maternity"],
      required: true,
    },
    status: {
      type: String,
      enum: ["vacant", "occupied", "cleaning", "maintenance"],
      default: "vacant",
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    currentPatient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      default: null,
    },
    assignedAt: {
      type: Date,
    },
    expectedDischargeDate: {
      type: Date,
    },
    pricePerDay: {
      type: Number,
      required: true,
      min: [0, "Price cannot be negative"],
    },
    amenities: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

bedSchema.index({ bedNumber: 1 }, { unique: true });
bedSchema.index({ status: 1 });
bedSchema.index({ department: 1, status: 1 });
bedSchema.index({ bedType: 1, status: 1 });

// Guard: occupied beds must have a currentPatient
bedSchema.pre("validate", function (next) {
  if (this.status === "occupied" && !this.currentPatient) {
    return next(new Error("Occupied beds must have a currentPatient assigned"));
  }
  if (this.status !== "occupied" && this.currentPatient) {
    return next(new Error("Only occupied beds may have a currentPatient assigned"));
  }
  next();
});

export default model<IBed>("Bed", bedSchema);
