import Hospital, { IHospital } from '../models/Hospital.model';
import { ApiError } from '../utils/ApiError';

export const getAllHospitals = async (filter: any = {}): Promise<IHospital[]> => {
  return Hospital.find(filter).sort({ name: 1 });
};

export const getHospitalById = async (id: string): Promise<IHospital> => {
  const hospital = await Hospital.findById(id);
  if (!hospital) throw ApiError.notFound('Hospital not found');
  return hospital;
};

export const createHospital = async (data: Partial<IHospital>): Promise<IHospital> => {
  if (data.code) {
    const existing = await Hospital.findOne({ code: data.code });
    if (existing) throw ApiError.conflict('Hospital code already exists');
  }
  return Hospital.create(data);
};
