import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { getAllHospitals, getHospitalById as fetchHospitalById, createHospital } from '../services/hospital.service';

export const getHospitals = asyncHandler(async (req: Request, res: Response) => {
  const hospitals = await getAllHospitals(req.query);
  res.status(200).json(new ApiResponse(200, { hospitals }));
});

export const getHospitalById = asyncHandler(async (req: Request, res: Response) => {
  const hospital = await fetchHospitalById(req.params.id);
  res.status(200).json(new ApiResponse(200, hospital));
});

export const createHospitalController = asyncHandler(async (req: Request, res: Response) => {
  const hospital = await createHospital(req.body);
  res.status(201).json(new ApiResponse(201, hospital, 'Hospital created successfully'));
});
