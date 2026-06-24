import { Schema, model, Document, Types } from "mongoose";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type AppointmentType = "walk_in" | "scheduled" | "emergency" | "follow_up";

export interface IAppointment extends Document {
  patient: Types.ObjectId;
  doctor: Types.ObjectId;
  department: Types.ObjectId;
  appointmentType: AppointmentType;
  scheduledDate: Date;
  scheduledTimeSlot?: string; // "09:30"
  status: AppointmentStatus;
  reasonForVisit: string;
  symptoms: string[];
  notes?: string;
  cancellationReason?: string;
  checkedInAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  queueEntry?: Types.ObjectId;
  createdBy: Types.ObjectId; // user who created it (reception/patient)
  noShowRiskScore?: number;
  noShowRiskLevel?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    doctor: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    appointmentType: {
      type: String,
      enum: ["walk_in", "scheduled", "emergency", "follow_up"],
      default: "scheduled",
    },
    scheduledDate: {
      type: Date,
      required: [true, "Scheduled date is required"],
    },
    scheduledTimeSlot: {
      type: String,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time slot format"],
    },
    status: {
      type: String,
      enum: [
        "scheduled",
        "confirmed",
        "checked_in",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      default: "scheduled",
    },
    reasonForVisit: {
      type: String,
      required: [true, "Reason for visit is required"],
      trim: true,
      maxlength: 500,
    },
    symptoms: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    cancellationReason: {
      type: String,
      maxlength: 300,
    },
    checkedInAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    queueEntry: {
      type: Schema.Types.ObjectId,
      ref: "QueueEntry",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    noShowRiskScore: {
      type: Number,
      default: null,
    },
    noShowRiskLevel: {
      type: String,
      enum: ["Low", "Medium", "High", null],
      default: null,
    },
  },
  { timestamps: true }
);

appointmentSchema.index({ patient: 1, scheduledDate: -1 });
appointmentSchema.index({ doctor: 1, scheduledDate: -1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ department: 1, scheduledDate: -1 });

export default model<IAppointment>("Appointment", appointmentSchema);
