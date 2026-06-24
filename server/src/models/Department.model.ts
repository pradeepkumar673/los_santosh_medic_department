import { Schema, model, Document, Types } from "mongoose";

export interface IDepartment extends Document {
  name: string;
  code: string;
  description?: string;
  headDoctor?: Types.ObjectId;
  isActive: boolean;
  avgConsultationTime: number; // in minutes, used for queue ETA calc
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Department code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 10,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    headDoctor: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    avgConsultationTime: {
      type: Number,
      default: 15,
      min: [1, "Average consultation time must be at least 1 minute"],
    },
  },
  { timestamps: true }
);

departmentSchema.index({ name: 1 }, { unique: true });
departmentSchema.index({ code: 1 }, { unique: true });

export default model<IDepartment>("Department", departmentSchema);
