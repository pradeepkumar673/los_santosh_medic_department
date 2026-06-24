import { Schema, model, Document, Types } from "mongoose";

export type NotificationType =
  | "queue_update"
  | "appointment_reminder"
  | "appointment_confirmed"
  | "appointment_cancelled"
  | "turn_approaching"
  | "your_turn"
  | "lab_result_ready"
  | "system_alert";

export type NotificationChannel = "in_app" | "sms" | "email" | "push";

export interface INotification extends Document {
  recipient: Types.ObjectId; // User ref
  type: NotificationType;
  title: string;
  message: string;
  channel: NotificationChannel[];
  relatedQueueEntry?: Types.ObjectId;
  relatedAppointment?: Types.ObjectId;
  isRead: boolean;
  readAt?: Date;
  sentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "queue_update",
        "appointment_reminder",
        "appointment_confirmed",
        "appointment_cancelled",
        "turn_approaching",
        "your_turn",
        "lab_result_ready",
        "system_alert",
      ],
      required: true,
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
      maxlength: 150,
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
      maxlength: 500,
    },
    channel: {
      type: [String],
      enum: ["in_app", "sms", "email", "push"],
      default: ["in_app"],
    },
    relatedQueueEntry: {
      type: Schema.Types.ObjectId,
      ref: "QueueEntry",
    },
    relatedAppointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });

export default model<INotification>("Notification", notificationSchema);
