import { Schema, model, Document, Types } from "mongoose";

export type AllocationStatus = "active" | "discharged" | "transferred";

export interface IBedAllocation extends Document {
  bed: Types.ObjectId;
  patient: Types.ObjectId;
  department: Types.ObjectId;
  allocatedBy: Types.ObjectId;
  dischargedBy?: Types.ObjectId;
  allocatedAt: Date;
  dischargedAt?: Date;
  expectedDischargeDate?: Date;
  status: AllocationStatus;
  admissionReason: string;
  dischargeNotes?: string;
  totalDays?: number;
  totalBillingAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const bedAllocationSchema = new Schema<IBedAllocation>(
  {
    bed: {
      type: Schema.Types.ObjectId,
      ref: "Bed",
      required: true,
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    allocatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dischargedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    allocatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dischargedAt: {
      type: Date,
    },
    expectedDischargeDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "discharged", "transferred"],
      default: "active",
    },
    admissionReason: {
      type: String,
      required: [true, "Admission reason is required"],
      trim: true,
      maxlength: 500,
    },
    dischargeNotes: {
      type: String,
      maxlength: 1000,
      trim: true,
    },
    totalDays: {
      type: Number,
      min: 0,
    },
    totalBillingAmount: {
      type: Number,
      min: 0,
    },
  },
  { timestamps: true }
);

bedAllocationSchema.index({ bed: 1, status: 1 });
bedAllocationSchema.index({ patient: 1, status: 1 });
bedAllocationSchema.index({ patient: 1, allocatedAt: -1 });
bedAllocationSchema.index({ department: 1, allocatedAt: -1 });

export default model<IBedAllocation>("BedAllocation", bedAllocationSchema);
