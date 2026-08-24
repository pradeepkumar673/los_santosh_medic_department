import Resource, { IResource } from '../models/Resource.model';
import Incident from '../models/Incident.model';
import { ApiError } from '../utils/ApiError';
import mongoose from 'mongoose';

const VENTILATOR_TURNAROUND_MINUTES = 30;

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface VentilatorStatus {
  hospitalId: string;
  total: number;
  availableNow: number;
  occupied: number;
  reserved: number;
  maintenance: number;
  expectedAvailableIn30: number;
  expectedAvailableIn60: number;
  activeIncidentDemand: number;
}

export interface VentilatorRiskResult {
  hospitalId: string;
  timeWindowMinutes: number;
  availableNow: number;
  expectedAvailableIn30: number;
  expectedAvailableIn60: number;
  expectedReleasesInWindow: number;
  projectedSupplyInWindow: number;
  expectedDemand: number;
  shortageProbability: number;
  riskLevel: RiskLevel;
  recommendedActions: string[];
}

export async function getActiveIncidentDemand(): Promise<number> {
  const incidents = await Incident.find({ status: 'active' });
  return incidents.reduce((sum, inc) => sum + (inc.predictedArrivals || 0), 0);
}

export function predictReleaseTimes(
  resources: IResource[],
  minutes: number,
  turnaroundMinutes: number = VENTILATOR_TURNAROUND_MINUTES
): number {
  const now = Date.now();
  const windowEnd = now + minutes * 60 * 1000;
  let expectedReleases = 0;

  for (const res of resources) {
    if (res.occupied <= 0 || !res.expectedReleaseTime) continue;
    
    const releaseTime = new Date(res.expectedReleaseTime).getTime();
    const readyTime = releaseTime + turnaroundMinutes * 60 * 1000;
    
    if (readyTime <= windowEnd) {
      const confidence = res.releaseConfidence ?? 0.5;
      expectedReleases += res.occupied * confidence;
    }
  }
  return expectedReleases;
}

export async function getVentilatorStatus(hospitalId: string): Promise<VentilatorStatus> {
  const resources = await Resource.find({
    hospitalId: new mongoose.Types.ObjectId(hospitalId),
    type: 'ventilator'
  });

  if (resources.length === 0) {
    throw ApiError.notFound('No ventilator resources found for this hospital');
  }

  let total = 0, availableNow = 0, occupied = 0, reserved = 0, maintenance = 0;
  for (const res of resources) {
    total += res.total;
    availableNow += res.available;
    occupied += res.occupied;
    reserved += res.reserved;
    maintenance += res.maintenance;
  }

  const expectedAvailableIn30 = predictReleaseTimes(resources, 30);
  const expectedAvailableIn60 = predictReleaseTimes(resources, 60);
  const activeIncidentDemand = await getActiveIncidentDemand();

  return {
    hospitalId,
    total,
    availableNow,
    occupied,
    reserved,
    maintenance,
    expectedAvailableIn30: Math.round(expectedAvailableIn30 * 10) / 10,
    expectedAvailableIn60: Math.round(expectedAvailableIn60 * 10) / 10,
    activeIncidentDemand
  };
}

export async function calculateShortageRisk(
  hospitalId: string,
  expectedCriticalArrivals: number,
  timeWindowMinutes: number = 60
): Promise<VentilatorRiskResult> {
  const resources = await Resource.find({
    hospitalId: new mongoose.Types.ObjectId(hospitalId),
    type: 'ventilator'
  });

  if (resources.length === 0) {
    throw ApiError.notFound('No ventilator resources found for this hospital');
  }

  const status = await getVentilatorStatus(hospitalId);
  const expectedReleases = predictReleaseTimes(resources, timeWindowMinutes);
  
  const projectedSupply = status.availableNow + expectedReleases;
  const demand = expectedCriticalArrivals + status.activeIncidentDemand;

  let shortageProbability = 0.05;
  if (demand > 0) {
    const ratio = projectedSupply / demand;
    if (ratio >= 1.5) {
      shortageProbability = 0.05;
    } else if (ratio >= 1.0) {
      shortageProbability = 0.1 + (1.5 - ratio) * 0.4;
    } else {
      shortageProbability = 0.3 + (1.0 - ratio) * 0.7;
    }
  }
  shortageProbability = Math.min(0.99, Math.max(0.01, shortageProbability));

  let riskLevel: RiskLevel;
  if (shortageProbability >= 0.85) riskLevel = 'Critical';
  else if (shortageProbability >= 0.6) riskLevel = 'High';
  else if (shortageProbability >= 0.3) riskLevel = 'Medium';
  else riskLevel = 'Low';

  const recommendedActions: string[] = [];
  
  if (status.availableNow === 0) {
    recommendedActions.push('All ventilators currently occupied — escalate to emergency command center immediately.');
  }
  if (shortageProbability >= 0.6) {
    recommendedActions.push('Activate surge protocol and prepare overflow capacity.');
    recommendedActions.push('Contact regional coordination for cross-hospital transfer options.');
  }
  if (shortageProbability >= 0.85) {
    recommendedActions.push('Initiate EmergencyFlow AI resource allocation recommendation.');
    recommendedActions.push('Prepare manual ventilation bags (Ambu bags) as contingency.');
  }
  if (projectedSupply < demand) {
    recommendedActions.push(`Projected deficit of ${Math.ceil(demand - projectedSupply)} ventilators in the next ${timeWindowMinutes} minutes.`);
  }
  if (expectedReleases === 0 && status.occupied > 0) {
    recommendedActions.push('No ventilator releases predicted in the current window. Consider early discharge review or inter-hospital transfer.');
  }

  return {
    hospitalId,
    timeWindowMinutes,
    availableNow: status.availableNow,
    expectedAvailableIn30: status.expectedAvailableIn30,
    expectedAvailableIn60: status.expectedAvailableIn60,
    expectedReleasesInWindow: Math.round(expectedReleases * 10) / 10,
    projectedSupplyInWindow: Math.round(projectedSupply * 10) / 10,
    expectedDemand: demand,
    shortageProbability: Number(shortageProbability.toFixed(2)),
    riskLevel,
    recommendedActions
  };
}
