import { Schema, model, Document, Types } from 'mongoose';

export type ResourceType =
  | 'ventilator'
  | 'icu_bed'
  | 'emergency_bed'
  | 'oxygen'
  | 'blood_o_neg'
  | 'ambulance'
  | 'trauma_nurse'
  | 'other';

export interface IResourceStatusHistory {
  status: string;
  changedAt: Date;
  reason?: string;
}

export interface IResource extends Document {
  hospitalId: Types.ObjectId;
  type: ResourceType;
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  maintenance: number;
  expectedReleaseTime?: Date;
  releaseConfidence?: number;
  statusHistory: IResourceStatusHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const resourceStatusHistorySchema = new Schema<IResourceStatusHistory>(
  {
    status: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    reason: { type: String },
  },
  { _id: false }
);

const resourceSchema = new Schema<IResource>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'ventilator',
        'icu_bed',
        'emergency_bed',
        'oxygen',
        'blood_o_neg',
        'ambulance',
        'trauma_nurse',
        'other',
      ],
      required: true,
    },
    total: { type: Number, required: true, min: 0, default: 0 },
    available: { type: Number, required: true, min: 0, default: 0 },
    occupied: { type: Number, required: true, min: 0, default: 0 },
    reserved: { type: Number, required: true, min: 0, default: 0 },
    maintenance: { type: Number, required: true, min: 0, default: 0 },
    expectedReleaseTime: { type: Date },
    releaseConfidence: { type: Number, min: 0, max: 1 },
    statusHistory: {
      type: [resourceStatusHistorySchema],
      default: [],
    },
  },
  { timestamps: true }
);

resourceSchema.index({ hospitalId: 1, type: 1 });
resourceSchema.index({ type: 1, available: 1 });

export default model<IResource>('Resource', resourceSchema);
