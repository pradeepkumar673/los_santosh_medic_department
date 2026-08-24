import Resource, { IResource, ResourceType } from '../models/Resource.model';
import { ApiError } from '../utils/ApiError';
import mongoose from 'mongoose';
import { getActiveIncidentDemand, RiskLevel } from './ventilator.service';

const TURNAROUND_MAP: Record<ResourceType, number> = {
  ventilator: 30,
  icu_bed: 45,
  emergency_bed: 20,
  oxygen: 5,
  blood_o_neg: 15,
  ambulance: 20,
  trauma_nurse: 10,
  other: 15
};

export interface GenericShortageResult {
  hospitalId: string;
  resourceType: ResourceType;
  timeWindowMinutes: number;
  availableNow: number;
  expectedReleasesInWindow: number;
  projectedSupplyInWindow: number;
  expectedDemand: number;
  shortageProbability: number;
  riskLevel: RiskLevel;
  recommendedActions: string[];
}

export function predictGenericReleases(
  resources: IResource[],
  minutes: number,
  turnaroundMinutes: number
): number {
  const now = Date.now();
  const windowEnd = now + minutes * 60 * 1000;
  let expected = 0;

  for (const res of resources) {
    if (res.occupied <= 0 || !res.expectedReleaseTime) continue;
    
    const readyTime = new Date(res.expectedReleaseTime).getTime() + turnaroundMinutes * 60 * 1000;
    if (readyTime <= windowEnd) {
      const confidence = res.releaseConfidence ?? 0.5;
      expected += res.occupied * confidence;
    }
  }
  return expected;
}

export async function calculateGenericShortageRisk(
  hospitalId: string,
  resourceType: ResourceType,
  expectedCriticalArrivals: number,
  timeWindowMinutes: number = 60
): Promise<GenericShortageResult> {
  const resources = await Resource.find({
    hospitalId: new mongoose.Types.ObjectId(hospitalId),
    type: resourceType
  });

  if (resources.length === 0) {
    throw ApiError.notFound(`No ${resourceType} resources found for this hospital`);
  }

  let total = 0, availableNow = 0, occupied = 0, reserved = 0, maintenance = 0;
  for (const res of resources) {
    total += res.total;
    availableNow += res.available;
    occupied += res.occupied;
    reserved += res.reserved;
    maintenance += res.maintenance;
  }

  const turnaround = TURNAROUND_MAP[resourceType] || 15;
  const expectedReleases = predictGenericReleases(resources, timeWindowMinutes, turnaround);
  const activeIncidentDemand = await getActiveIncidentDemand();
  
  const projectedSupply = availableNow + expectedReleases;
  const demand = expectedCriticalArrivals + activeIncidentDemand;

  let shortageProbability = 0.05;
  if (demand > 0) {
    const ratio = projectedSupply / demand;
    if (ratio >= 1.5) shortageProbability = 0.05;
    else if (ratio >= 1.0) shortageProbability = 0.1 + (1.5 - ratio) * 0.4;
    else shortageProbability = 0.3 + (1.0 - ratio) * 0.7;
  }
  shortageProbability = Math.min(0.99, Math.max(0.01, shortageProbability));

  let riskLevel: RiskLevel;
  if (shortageProbability >= 0.85) riskLevel = 'Critical';
  else if (shortageProbability >= 0.6) riskLevel = 'High';
  else if (shortageProbability >= 0.3) riskLevel = 'Medium';
  else riskLevel = 'Low';

  const recommendedActions: string[] = [];
  if (availableNow === 0) {
    recommendedActions.push(`No ${resourceType} currently available.`);
  }
  if (shortageProbability >= 0.6) {
    recommendedActions.push(`High risk of ${resourceType} shortage — activate contingency plan.`);
  }
  if (projectedSupply < demand) {
    recommendedActions.push(`Projected deficit of ${Math.ceil(demand - projectedSupply)} ${resourceType} units.`);
  }

  return {
    hospitalId,
    resourceType,
    timeWindowMinutes,
    availableNow,
    expectedReleasesInWindow: Math.round(expectedReleases * 10) / 10,
    projectedSupplyInWindow: Math.round(projectedSupply * 10) / 10,
    expectedDemand: demand,
    shortageProbability: Number(shortageProbability.toFixed(2)),
    riskLevel,
    recommendedActions
  };
}
