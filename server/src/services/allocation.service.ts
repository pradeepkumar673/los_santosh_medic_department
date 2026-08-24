import mongoose from 'mongoose';
import Hospital, { IHospital } from '../models/Hospital.model';
import Resource, { IResource, ResourceType } from '../models/Resource.model';
import Incident, { IIncident } from '../models/Incident.model';
import Recommendation, { IRecommendation, RecommendationType } from '../models/Recommendation.model';
import { ApiError } from '../utils/ApiError';
import { predictReleaseTimes } from './ventilator.service';
import { createRecommendation } from './recommendation.service';

const AVG_AMBULANCE_SPEED_KMH = 32;
const MIN_SCORE_FOR_RECOMMENDATION = 35;
const MAX_RECOMMENDATIONS = 3;

export const SCORE_WEIGHTS = {
  distance: 0.3,
  careBundle: 0.3,
  currentLoad: 0.2,
  surgeCapacity: 0.2,
};

const TURNAROUND_MINUTES: Record<ResourceType, number> = {
  ventilator: 30,
  icu_bed: 45,
  emergency_bed: 20,
  oxygen: 5,
  blood_o_neg: 15,
  ambulance: 20,
  trauma_nurse: 10,
  other: 15,
};

export interface BundleNeed {
  type: ResourceType;
  quantity: number;
  weight: number;
  reason: string;
  action: string;
}

export interface CapabilitySnapshot {
  type: ResourceType;
  required: number;
  availableNow: number;
  predictedIn60Min: number;
  occupied: number;
  total: number;
}

export interface HospitalRanking {
  rank: number;
  hospitalId: string;
  name: string;
  code: string;
  traumaLevel: number;
  distanceKm: number;
  travelMinutes: number;
  scores: {
    distance: number;
    careBundle: number;
    currentLoad: number;
    surgeCapacity: number;
    composite: number;
  };
  capabilities: CapabilitySnapshot[];
  explanation: string[];
}

export interface AllocationPlan {
  incident: IIncident;
  needs: BundleNeed[];
  ranking: HospitalRanking[];
  recommendations: IRecommendation[];
  reusedPending: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const round1 = (value: number): number => Math.round(value * 10) / 10;
const round2 = (value: number): number => Math.round(value * 100) / 100;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function computeResourceNeeds(incident: IIncident): BundleNeed[] {
  const arrivals = Math.max(incident.predictedArrivals ?? 0, incident.reportedCasualties ?? 0, 1);
  const eventType = (incident.eventType || '').toLowerCase();

  const isRespiratory = /(respir|pandemic|outbreak|chemical|gas|smoke|inhal)/.test(eventType);
  const isTrauma = /(accident|crash|collision|explosion|blast|fire|earthquake|collapse|trauma|derail|stampede)/.test(eventType);
  const isWeather = incident.weatherLinked || /(flood|storm|cyclone|hurricane|rain)/.test(eventType);

  const needs: BundleNeed[] = [
    {
      type: 'emergency_bed',
      quantity: Math.max(1, Math.ceil(arrivals * 0.5)),
      weight: 0.25,
      reason: `~50% of ${arrivals} predicted arrivals require emergency beds`,
      action: 'prepare beds',
    },
    {
      type: 'icu_bed',
      quantity: Math.max(1, Math.ceil(arrivals * 0.25)),
      weight: 0.2,
      reason: `~25% of predicted arrivals require ICU-level care`,
      action: 'prepare beds',
    },
  ];

  if (isRespiratory) {
    needs.push({
      type: 'ventilator',
      quantity: Math.max(1, Math.ceil(arrivals * 0.3)),
      weight: 0.3,
      reason: 'Respiratory/chemical event profile — high ventilator demand expected',
      action: 'reserve ventilators',
    });
    needs.push({
      type: 'oxygen',
      quantity: Math.max(2, Math.ceil(arrivals * 0.4)),
      weight: 0.1,
      reason: 'Supplemental oxygen demand for respiratory cases',
      action: 'reserve oxygen',
    });
  } else if (isTrauma) {
    needs.push({
      type: 'ventilator',
      quantity: Math.max(1, Math.ceil(arrivals * 0.15)),
      weight: 0.2,
      reason: 'Trauma event profile — ventilator support for critical injuries',
      action: 'reserve ventilators',
    });
    needs.push({
      type: 'trauma_nurse',
      quantity: Math.max(1, Math.ceil(arrivals * 0.2)),
      weight: 0.15,
      reason: 'Trauma nursing staff required for casualty intake',
      action: 'stage trauma team',
    });
    needs.push({
      type: 'blood_o_neg',
      quantity: Math.max(2, Math.ceil(arrivals * 0.4)),
      weight: 0.1,
      reason: 'O-negative blood units for untyped trauma transfusion',
      action: 'reserve blood units',
    });
  } else if (isWeather) {
    needs.push({
      type: 'ventilator',
      quantity: Math.max(1, Math.ceil(arrivals * 0.1)),
      weight: 0.15,
      reason: 'Weather event — moderate ventilator contingency',
      action: 'reserve ventilators',
    });
    needs.push({
      type: 'oxygen',
      quantity: Math.max(2, Math.ceil(arrivals * 0.2)),
      weight: 0.1,
      reason: 'Weather event — oxygen contingency',
      action: 'reserve oxygen',
    });
  } else {
    needs.push({
      type: 'ventilator',
      quantity: Math.max(1, Math.ceil(arrivals * 0.1)),
      weight: 0.15,
      reason: 'Baseline ventilator contingency for predicted arrivals',
      action: 'reserve ventilators',
    });
  }

  needs.push({
    type: 'ambulance',
    quantity: Math.max(1, Math.ceil(arrivals * 0.15)),
    weight: 0.15,
    reason: 'Transport capacity for patient routing from incident site',
    action: 'stage ambulances',
  });

  return needs;
}

function scoreHospital(
  hospital: IHospital,
  resources: IResource[],
  needs: BundleNeed[],
  incident: IIncident
): Omit<HospitalRanking, 'rank'> {
  const explanation: string[] = [];
  const coords = incident.location?.coordinates?.coordinates;

  const incidentLng = Array.isArray(coords) ? coords[0] : 80.2707;
  const incidentLat = Array.isArray(coords) ? coords[1] : 13.0827;

  const distanceKm = round1(
    haversineKm(incidentLat, incidentLng, hospital.location.lat, hospital.location.lng)
  );
  const travelMinutes = Math.max(3, Math.round((distanceKm / AVG_AMBULANCE_SPEED_KMH) * 60));

  const distanceScore = round1(clamp(100 - distanceKm * 4, 0, 100));
  explanation.push(
    `Distance: ${distanceKm} km (~${travelMinutes} min ambulance transit) -> distance score ${distanceScore}/100`
  );

  const capabilities: CapabilitySnapshot[] = [];
  let bundleScoreSum = 0;
  let bundleWeightSum = 0;

  for (const need of needs) {
    const matching = resources.filter((r) => r.type === need.type);

    let availNow = 0;
    let occ = 0;
    let tot = 0;

    for (const r of matching) {
      availNow += r.available;
      occ += r.occupied;
      tot += r.total;
    }

    const turnaround = TURNAROUND_MINUTES[need.type] || 15;
    const predictedReleases = predictReleaseTimes(matching, 60, turnaround);
    const predictedIn60 = availNow + predictedReleases;

    capabilities.push({
      type: need.type,
      required: need.quantity,
      availableNow: availNow,
      predictedIn60Min: round1(predictedIn60),
      occupied: occ,
      total: tot,
    });

    const satisfiesNow = availNow >= need.quantity;
    const satisfiesIn60 = predictedIn60 >= need.quantity;

    let subScore = 0;
    if (satisfiesNow) {
      subScore = 100;
    } else if (satisfiesIn60) {
      subScore = 60 + (predictedIn60 / need.quantity) * 25;
    } else if (availNow > 0) {
      subScore = (availNow / need.quantity) * 50;
    } else {
      subScore = 0;
    }

    subScore = clamp(subScore, 0, 100);
    bundleScoreSum += subScore * need.weight;
    bundleWeightSum += need.weight;
  }

  const careBundleScore = round1(bundleWeightSum > 0 ? bundleScoreSum / bundleWeightSum : 0);
  explanation.push(
    `Care bundle coverage: score ${careBundleScore}/100 based on resource availability across ${needs.length} required care components`
  );

  let utilWeighted = 0;
  let utilWeightSum = 0;
  for (const need of needs) {
    const cap = capabilities.find((c) => c.type === need.type);
    if (cap && cap.total > 0) {
      utilWeighted += (cap.occupied / cap.total) * need.weight;
      utilWeightSum += need.weight;
    }
  }
  const utilization = utilWeightSum > 0 ? utilWeighted / utilWeightSum : 0.5;
  const currentLoadScore = round1(clamp(100 * (1 - utilization), 0, 100));
  explanation.push(
    `Current load: weighted utilization ${(utilization * 100).toFixed(0)}% across required resources -> load score ${currentLoadScore}/100`
  );

  const arrivals = Math.max(incident.predictedArrivals ?? 0, incident.reportedCasualties ?? 0, 1);
  const headroom = capabilities.reduce((sum, c) => sum + (c.total - c.occupied), 0);
  const surgeCapacityScore = round1(clamp((100 * headroom) / arrivals, 0, 100));
  explanation.push(
    `Surge capacity: ${headroom} units of headroom against ${arrivals} predicted arrivals -> surge score ${surgeCapacityScore}/100`
  );

  const composite = round1(
    SCORE_WEIGHTS.distance * distanceScore +
      SCORE_WEIGHTS.careBundle * careBundleScore +
      SCORE_WEIGHTS.currentLoad * currentLoadScore +
      SCORE_WEIGHTS.surgeCapacity * surgeCapacityScore
  );

  return {
    hospitalId: String(hospital._id),
    name: hospital.name,
    code: hospital.code,
    traumaLevel: hospital.traumaLevel,
    distanceKm,
    travelMinutes,
    scores: {
      distance: distanceScore,
      careBundle: careBundleScore,
      currentLoad: currentLoadScore,
      surgeCapacity: surgeCapacityScore,
      composite,
    },
    capabilities,
    explanation,
  };
}

export async function generateRecommendationsForIncident(
  incidentId: string,
  userId: string,
  patientIds: string[] = []
): Promise<AllocationPlan> {
  const incident = await Incident.findById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');
  if (incident.status === 'resolved') {
    throw ApiError.badRequest('Incident is already resolved — no allocation needed');
  }

  const hospitals = await Hospital.find({ isActive: true });
  if (hospitals.length === 0) throw ApiError.notFound('No active hospitals in the network');

  const allResources = await Resource.find({
    hospitalId: { $in: hospitals.map((h) => h._id) },
  });

  const needs = computeResourceNeeds(incident);

  const scored = hospitals.map((hospital) =>
    scoreHospital(
      hospital,
      allResources.filter((r) => String(r.hospitalId) === String(hospital._id)),
      needs,
      incident
    )
  );
  scored.sort((a, b) => b.scores.composite - a.scores.composite);
  const ranking: HospitalRanking[] = scored.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));

  const recType: RecommendationType = incident.status === 'active' ? 'allocation' : 'preparedness';
  const validPatientIds = patientIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

  const recommendations: IRecommendation[] = [];
  let reusedPending = 0;

  const candidates = ranking
    .filter((entry) => entry.scores.composite >= MIN_SCORE_FOR_RECOMMENDATION)
    .slice(0, MAX_RECOMMENDATIONS);

  for (const candidate of candidates) {
    const existing = await Recommendation.findOne({
      incidentId: incident._id,
      targetHospitalId: candidate.hospitalId,
      type: recType,
      status: 'pending',
    });
    if (existing) {
      recommendations.push(existing);
      reusedPending += 1;
      continue;
    }

    const completeness =
      candidate.capabilities.length > 0
        ? candidate.capabilities.filter((c) => c.total > 0).length / candidate.capabilities.length
        : 0;
    const confidence = round2(
      clamp(
        0.45 * (candidate.scores.composite / 100) +
          0.35 * (incident.confidenceScore ?? 0.5) +
          0.2 * completeness,
        0.05,
        0.99
      )
    );

    const alternatives = ranking
      .filter((entry) => entry.hospitalId !== candidate.hospitalId)
      .slice(0, 2)
      .map((entry) => `Alternative #${entry.rank}: ${entry.name} (composite ${entry.scores.composite}/100)`);

    const actionPlan = needs.map((need) => `${need.action}: ${need.quantity} ${need.type}`).join('; ');

    const explanation: string[] = [
      `Rank #${candidate.rank} for incident "${incident.eventType}" — composite score ${candidate.scores.composite}/100 (distance ${SCORE_WEIGHTS.distance * 100}%, care-bundle ${SCORE_WEIGHTS.careBundle * 100}%, current load ${SCORE_WEIGHTS.currentLoad * 100}%, surge capacity ${SCORE_WEIGHTS.surgeCapacity * 100}%)`,
      ...candidate.explanation,
      `Incident context: severity=${incident.severity}, predicted arrivals=${incident.predictedArrivals ?? 0}, source confidence=${incident.confidenceScore}`,
      `Action plan: route patients to ${candidate.code}; ${actionPlan}`,
      ...alternatives,
      'Human approval required before any resource is committed.',
    ];

    const recommendation = await createRecommendation(
      {
        incidentId: incident._id,
        type: recType,
        targetHospitalId: candidate.hospitalId,
        patientIds: validPatientIds,
        resourceRequests: needs.map((need) => ({ type: need.type, quantity: need.quantity })),
        explanation,
        confidence,
      },
      userId
    );
    recommendations.push(recommendation);
  }

  if (recommendations.length === 0) {
    throw ApiError.badRequest(
      'No hospital met the minimum suitability threshold — manual escalation required'
    );
  }

  return { incident, needs, ranking, recommendations, reusedPending };
}
