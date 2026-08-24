import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  userId: Types.ObjectId;
  action: string;
  entityType: string;
  entityId: Types.ObjectId | string;
  previousValue?: any;
  newValue?: any;
  reason?: string;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
    trim: true,
  },
  entityType: {
    type: String,
    required: true,
    trim: true,
  },
  entityId: {
    type: Schema.Types.Mixed,
    required: true,
  },
  previousValue: {
    type: Schema.Types.Mixed,
  },
  newValue: {
    type: Schema.Types.Mixed,
  },
  reason: {
    type: String,
    maxlength: 1000,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ action: 1 });

export default model<IAuditLog>('AuditLog', auditLogSchema);
