import Resource, { IResource, ResourceType } from '../models/Resource.model';
import { ApiError } from '../utils/ApiError';
import mongoose from 'mongoose';

export const getHospitalResources = async (
  hospitalId: string,
  filter: any = {}
): Promise<IResource[]> => {
  if (hospitalId && mongoose.Types.ObjectId.isValid(hospitalId)) {
    filter.hospitalId = new mongoose.Types.ObjectId(hospitalId);
  }
  return Resource.find(filter).sort({ type: 1 });
};

export const updateResourceStatus = async (
  resourceId: string,
  update: Partial<IResource> & { reason?: string; status?: string }
): Promise<IResource> => {
  const resource = await Resource.findById(resourceId);
  if (!resource) throw ApiError.notFound('Resource not found');

  if (update.occupied !== undefined) resource.occupied = update.occupied;
  if (update.available !== undefined) resource.available = update.available;
  if (update.reserved !== undefined) resource.reserved = update.reserved;
  if (update.maintenance !== undefined) resource.maintenance = update.maintenance;
  if (update.expectedReleaseTime !== undefined) resource.expectedReleaseTime = update.expectedReleaseTime;
  if (update.releaseConfidence !== undefined) resource.releaseConfidence = update.releaseConfidence;
  
  resource.statusHistory.push({
    status: update.status || 'updated',
    changedAt: new Date(),
    reason: update.reason || 'Manual update'
  });

  await resource.save();
  return resource;
};

export const reserveResource = async (resourceId: string, quantity: number): Promise<IResource> => {
  const resource = await Resource.findById(resourceId);
  if (!resource) throw ApiError.notFound('Resource not found');
  if (resource.available < quantity) {
    throw ApiError.badRequest(`Not enough available resources. Only ${resource.available} available.`);
  }
  
  resource.available -= quantity;
  resource.reserved += quantity;
  resource.statusHistory.push({
    status: 'reserved',
    changedAt: new Date(),
    reason: `Reserved ${quantity} units`
  });
  
  await resource.save();
  return resource;
};

export const releaseResource = async (resourceId: string, quantity: number): Promise<IResource> => {
  const resource = await Resource.findById(resourceId);
  if (!resource) throw ApiError.notFound('Resource not found');
  
  if (resource.reserved >= quantity) {
    resource.reserved -= quantity;
  } else if (resource.occupied >= quantity) {
    resource.occupied -= quantity;
  } else {
    throw ApiError.badRequest('Not enough occupied/reserved resources to release.');
  }
  
  resource.available += quantity;
  resource.statusHistory.push({
    status: 'released',
    changedAt: new Date(),
    reason: `Released ${quantity} units`
  });
  
  await resource.save();
  return resource;
};

export const forecastVentilatorAvailability = async (
  hospitalId: string,
  hoursAhead: number
): Promise<any> => {
  const targetTime = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  
  const resources = await Resource.find({
    hospitalId: new mongoose.Types.ObjectId(hospitalId),
    type: 'ventilator'
  });

  let currentlyAvailable = 0;
  let predictedAvailable = 0;
  let expectedReleases: { time: Date; confidence: number; count: number }[] = [];

  for (const res of resources) {
    currentlyAvailable += res.available;
    
    if (res.expectedReleaseTime && res.expectedReleaseTime <= targetTime) {
      const expectedGain = res.occupied * (res.releaseConfidence || 0.5);
      predictedAvailable += expectedGain;
      expectedReleases.push({
        time: res.expectedReleaseTime,
        confidence: res.releaseConfidence || 0.5,
        count: res.occupied
      });
    }
  }

  return {
    hospitalId,
    targetTime,
    currentlyAvailable,
    predictedAvailable: currentlyAvailable + Math.round(predictedAvailable),
    expectedReleases
  };
};

export const getShortageRisk = async (
  hospitalId: string,
  resourceType: ResourceType
): Promise<any> => {
  const resources = await Resource.find({
    hospitalId: new mongoose.Types.ObjectId(hospitalId),
    type: resourceType
  });

  let total = 0, available = 0, occupied = 0, maintenance = 0;
  for (const res of resources) {
    total += res.total;
    available += res.available;
    occupied += res.occupied;
    maintenance += res.maintenance;
  }

  const utilizationRate = total > 0 ? (occupied / total) : 0;
  const riskLevel = utilizationRate > 0.85 ? 'Critical' : utilizationRate > 0.65 ? 'High' : utilizationRate > 0.4 ? 'Medium' : 'Low';

  return {
    hospitalId,
    resourceType,
    total,
    available,
    occupied,
    maintenance,
    utilizationRate: Number(utilizationRate.toFixed(2)),
    riskLevel
  };
};
