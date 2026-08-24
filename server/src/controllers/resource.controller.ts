import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import * as resourceService from '../services/resource.service';
import * as ventilatorService from '../services/ventilator.service';
import * as shortageService from '../services/shortage.service';
import { ResourceType } from '../models/Resource.model';

export const getResources = asyncHandler(async (req: Request, res: Response) => {
  const { hospitalId, type } = req.query;
  const filter: any = {};
  if (type) filter.type = type;
  
  const resources = await resourceService.getHospitalResources(hospitalId as string, filter);
  res.status(200).json(new ApiResponse(200, { resources }));
});

export const updateResourceStatusController = asyncHandler(async (req: Request, res: Response) => {
  const resource = await resourceService.updateResourceStatus(req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, resource, 'Resource updated'));
});

export const reserveResourceController = asyncHandler(async (req: Request, res: Response) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) throw ApiError.badRequest('Quantity must be at least 1');
  const resource = await resourceService.reserveResource(req.params.id, quantity);
  res.status(200).json(new ApiResponse(200, resource, 'Resource reserved'));
});

export const releaseResourceController = asyncHandler(async (req: Request, res: Response) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) throw ApiError.badRequest('Quantity must be at least 1');
  const resource = await resourceService.releaseResource(req.params.id, quantity);
  res.status(200).json(new ApiResponse(200, resource, 'Resource released'));
});

export const forecastVentilators = asyncHandler(async (req: Request, res: Response) => {
  const { hospitalId } = req.params;
  const hoursAhead = Number(req.query.hours) || 24;
  const forecast = await resourceService.forecastVentilatorAvailability(hospitalId, hoursAhead);
  res.status(200).json(new ApiResponse(200, forecast));
});

export const getShortageRiskController = asyncHandler(async (req: Request, res: Response) => {
  const { hospitalId, type } = req.params;
  const risk = await resourceService.getShortageRisk(hospitalId, type as ResourceType);
  res.status(200).json(new ApiResponse(200, risk));
});

export const getVentilatorStatusController = asyncHandler(async (req: Request, res: Response) => {
  const { hospitalId } = req.params;
  const status = await ventilatorService.getVentilatorStatus(hospitalId);
  res.status(200).json(new ApiResponse(200, status));
});

export const getShortageForecastController = asyncHandler(async (req: Request, res: Response) => {
  const { hospitalId, type, arrivals, window } = req.query;
  if (!hospitalId || !type) throw ApiError.badRequest('hospitalId and type are required');
  
  const forecast = await shortageService.calculateGenericShortageRisk(
    hospitalId as string,
    type as ResourceType,
    Number(arrivals) || 0,
    Number(window) || 60
  );
  res.status(200).json(new ApiResponse(200, forecast));
});

export const calculateVentilatorRiskController = asyncHandler(async (req: Request, res: Response) => {
  const { hospitalId, expectedCriticalArrivals, timeWindowMinutes } = req.body;
  if (!hospitalId) throw ApiError.badRequest('hospitalId is required');
  
  const risk = await ventilatorService.calculateShortageRisk(
    hospitalId,
    Number(expectedCriticalArrivals) || 0,
    Number(timeWindowMinutes) || 60
  );
  res.status(200).json(new ApiResponse(200, risk));
});
