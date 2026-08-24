import { Schema, model, Document, Types } from 'mongoose';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'monitoring' | 'active' | 'resolved';

export interface IIncident extends Document {
  eventType: string;
  location: {
    address: string;
    coordinates: {
      type: 'Point';
      coordinates: [number, number]; // [lng, lat]
    };
  };
  severity: IncidentSeverity;
  reportedCasualties: number;
  confidenceScore: number;
  source: string;
  status: IncidentStatus;
  weatherLinked: boolean;
  predictedArrivals: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const incidentSchema = new Schema<IIncident>(
  {
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      trim: true,
    },
    location: {
      address: { type: String, required: true },
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          required: true,
        },
      },
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
      default: 'medium',
    },
    reportedCasualties: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    confidenceScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0.5,
    },
    source: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['monitoring', 'active', 'resolved'],
      required: true,
      default: 'monitoring',
    },
    weatherLinked: {
      type: Boolean,
      default: false,
    },
    predictedArrivals: {
      type: Number,
      min: 0,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

incidentSchema.index({ status: 1 });
incidentSchema.index({ 'location.coordinates': '2dsphere' });
incidentSchema.index({ createdAt: -1 });

export default model<IIncident>('Incident', incidentSchema);
