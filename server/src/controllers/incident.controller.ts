import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import * as incidentService from '../services/incident.service';

export const createIncidentController = asyncHandler(async (req: Request, res: Response) => {
  const incident = await incidentService.createIncident(req.body, req.user!.id);
  res.status(201).json(new ApiResponse(201, incident, 'Incident created successfully'));
});

export const getIncidentsController = asyncHandler(async (req: Request, res: Response) => {
  const incidents = await incidentService.getIncidents(req.query);
  res.status(200).json(new ApiResponse(200, { incidents }));
});

export const getIncidentByIdController = asyncHandler(async (req: Request, res: Response) => {
  const incident = await incidentService.getIncidentById(req.params.id);
  res.status(200).json(new ApiResponse(200, incident));
});

export const updateIncidentStatusController = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['monitoring', 'active', 'resolved'].includes(status)) {
    throw ApiError.badRequest('Invalid status');
  }
  const incident = await incidentService.updateIncidentStatus(req.params.id, status, req.user!.id);
  res.status(200).json(new ApiResponse(200, incident, 'Incident status updated'));
});

export const checkWeatherRiskController = asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng, address } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw ApiError.badRequest('lat and lng are required numbers');
  }
  const result = await incidentService.checkWeatherAndAutoCreate(
    lat, 
    lng, 
    address || 'Unknown Location', 
    req.user!.id
  );
  res.status(200).json(new ApiResponse(200, result, result.created ? 'Weather incident auto-created' : 'Weather risk evaluated'));
});
