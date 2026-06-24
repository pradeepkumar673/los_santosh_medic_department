import { Schema, model, Document, Types } from "mongoose";

export type QueueStatus = "waiting" | "called" | "in_progress" | "completed" | "skipped" | "cancelled";
export type QueuePriority = "emergency" | "high" | "normal" | "low";

export interface IQueueEntry extends Document {
  tokenNumber: number;
  patient: Types.ObjectId;
  doctor: Types.ObjectId;
  department: Types.ObjectId;
  appointment?: Types.ObjectId;
  status: QueueStatus;
  priority: QueuePriority;
  estimatedWaitMinutes: number;
  queueDate: Date; // date-only, used for daily token reset
  checkedInAt: Date;
  calledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  positionInQueue: number;
  createdAt: Date;
  updatedAt: Date;
}

const queueEntrySchema = new Schema<IQueueEntry>(
  {
    tokenNumber: {
      type: Number,
      required: true,
      min: 1,
    },
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
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    status: {
      type: String,
      enum: ["waiting", "called", "in_progress", "completed", "skipped", "cancelled"],
      default: "waiting",
    },
    priority: {
      type: String,
      enum: ["emergency", "high", "normal", "low"],
      default: "normal",
    },
    estimatedWaitMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    queueDate: {
      type: Date,
      required: true,
      default: () => new Date(new Date().setHours(0, 0, 0, 0)),
    },
    checkedInAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    calledAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    positionInQueue: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Unique token per doctor per day
queueEntrySchema.index({ doctor: 1, queueDate: 1, tokenNumber: 1 }, { unique: true });
queueEntrySchema.index({ doctor: 1, status: 1, priority: 1 });
queueEntrySchema.index({ department: 1, queueDate: 1, status: 1 });
queueEntrySchema.index({ patient: 1, queueDate: 1 });

export default model<IQueueEntry>("QueueEntry", queueEntrySchema);
