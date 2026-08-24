import { Schema, model, Document } from 'mongoose';

export interface IHospital extends Document {
  name: string;
  code: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  specialties: string[];
  traumaLevel: number;
  contact: {
    phone: string;
    email: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const hospitalSchema = new Schema<IHospital>(
  {
    name: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Hospital code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, required: true, trim: true },
    },
    specialties: {
      type: [String],
      default: [],
    },
    traumaLevel: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    contact: {
      phone: { type: String, required: true },
      email: { type: String, required: true },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

hospitalSchema.index({ code: 1 }, { unique: true });
hospitalSchema.index({ isActive: 1 });

export default model<IHospital>('Hospital', hospitalSchema);
