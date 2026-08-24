import { Schema, model, Document, Types } from 'mongoose';

export type RecommendationType = 'allocation' | 'transfer' | 'reserve' | 'preparedness';
export type RecommendationStatus = 'pending' | 'approved' | 'rejected' | 'overridden';

export interface IResourceRequest {
  type: string;
  quantity: number;
}

export interface IRecommendation extends Document {
  incidentId: Types.ObjectId;
  type: RecommendationType;
  targetHospitalId: Types.ObjectId;
  patientIds: Types.ObjectId[];
  resourceRequests: IResourceRequest[];
  explanation: string[];
  confidence: number;
  status: RecommendationStatus;
  humanApprovalRequired: boolean;
  approvedBy?: Types.ObjectId;
  overrideReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const resourceRequestSchema = new Schema<IResourceRequest>(
  {
    type: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const recommendationSchema = new Schema<IRecommendation>(
  {
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
    },
    type: {
      type: String,
      enum: ['allocation', 'transfer', 'reserve', 'preparedness'],
      required: true,
    },
    targetHospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    patientIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Patient',
      default: [],
    },
    resourceRequests: {
      type: [resourceRequestSchema],
      default: [],
    },
    explanation: {
      type: [String],
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'overridden'],
      required: true,
      default: 'pending',
    },
    humanApprovalRequired: {
      type: Boolean,
      required: true,
      default: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    overrideReason: {
      type: String,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

recommendationSchema.index({ incidentId: 1 });
recommendationSchema.index({ status: 1 });
recommendationSchema.index({ targetHospitalId: 1 });
recommendationSchema.index({ createdAt: -1 });

export default model<IRecommendation>('Recommendation', recommendationSchema);
