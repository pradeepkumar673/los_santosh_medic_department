import apiClient from "./api.client";

/* Hospital */
export interface Hospital {
  _id: string;
  name: string;
  code: string;
  location: { lat: number; lng: number; address: string };
  specialties: string[];
  traumaLevel: number;
  contact: { phone: string; email: string };
  isActive: boolean;
}

/* Resource / Ventilator */
export interface Resource {
  _id: string;
  hospitalId: string;
  type: string;
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  maintenance: number;
  expectedReleaseTime?: string;
  releaseConfidence?: number;
}

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
  riskLevel: string;
  recommendedActions: string[];
}

export interface ShortageForecast {
  hospitalId: string;
  resourceType: string;
  timeWindowMinutes: number;
  availableNow: number;
  expectedReleasesInWindow: number;
  projectedSupplyInWindow: number;
  expectedDemand: number;
  shortageProbability: number;
  riskLevel: string;
  recommendedActions: string[];
}

/* Incident */
export interface Incident {
  _id: string;
  eventType: string;
  location: {
    address: string;
    coordinates: { type: string; coordinates: [number, number] };
  };
  severity: "low" | "medium" | "high" | "critical";
  reportedCasualties: number;
  confidenceScore: number;
  source: string;
  status: "monitoring" | "active" | "resolved";
  weatherLinked: boolean;
  predictedArrivals: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/* Weather */
export interface WeatherRiskResult {
  temperature: number;
  precipitation: number;
  wind_speed: number;
  weather_code: number;
  disasterRiskScore: number;
  riskLevel: string;
}

export interface WeatherCheckResponse {
  incident?: Incident;
  risk: WeatherRiskResult;
  created: boolean;
}

/* Recommendation */
export interface ResourceRequest {
  type: string;
  quantity: number;
}

export interface Recommendation {
  _id: string;
  incidentId: string | Incident;
  type: "allocation" | "transfer" | "reserve" | "preparedness";
  targetHospitalId: string | Hospital;
  patientIds: string[];
  resourceRequests: ResourceRequest[];
  explanation: string[];
  confidence: number;
  status: "pending" | "approved" | "rejected" | "overridden";
  humanApprovalRequired: boolean;
  approvedBy?: string;
  overrideReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActionResult {
  resourceType: string;
  requested: number;
  reserved: number;
  success: boolean;
  detail: string;
}

export interface ApprovalResult {
  recommendation: Recommendation;
  siblingsRejected: number;
  actionResults: ActionResult[];
}

export interface AllocationPlan {
  incident: Incident;
  needs: { type: string; quantity: number; weight: number; reason: string; action: string }[];
  ranking: {
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
    capabilities: {
      type: string;
      required: number;
      availableNow: number;
      predictedIn60Min: number;
      occupied: number;
      total: number;
    }[];
    explanation: string[];
  }[];
  recommendations: Recommendation[];
  reusedPending: number;
}

/* API Calls */

// Hospitals
export const fetchHospitals = () =>
  apiClient.get<{ data: { hospitals: Hospital[] } }>("/hospitals").then((r) => r.data.data.hospitals);

// Resources
export const fetchResources = (hospitalId?: string, type?: string) => {
  const params: Record<string, string> = {};
  if (hospitalId) params.hospitalId = hospitalId;
  if (type) params.type = type;
  return apiClient
    .get<{ data: { resources: Resource[] } }>("/resources", { params })
    .then((r) => r.data.data.resources);
};

export const fetchVentilatorStatus = (hospitalId: string) =>
  apiClient
    .get<{ data: VentilatorStatus }>(`/resources/ventilators/${hospitalId}`)
    .then((r) => r.data.data);

export const fetchVentilatorRisk = (
  hospitalId: string,
  expectedCriticalArrivals: number = 0,
  timeWindowMinutes: number = 60
) =>
  apiClient
    .post<{ data: VentilatorRiskResult }>("/resources/ventilator-risk", {
      hospitalId,
      expectedCriticalArrivals,
      timeWindowMinutes,
    })
    .then((r) => r.data.data);

export const fetchShortageForecast = (
  hospitalId: string,
  type: string,
  arrivals: number = 0,
  window: number = 60
) =>
  apiClient
    .get<{ data: ShortageForecast }>("/resources/shortage-forecast", {
      params: { hospitalId, type, arrivals, window },
    })
    .then((r) => r.data.data);

// Incidents
export const fetchIncidents = (params?: Record<string, string>) =>
  apiClient
    .get<{ data: { incidents: Incident[] } }>("/incidents", { params })
    .then((r) => r.data.data.incidents);

export const fetchIncidentById = (id: string) =>
  apiClient.get<{ data: Incident }>(`/incidents/${id}`).then((r) => r.data.data);

export const createIncident = (data: Partial<Incident>) =>
  apiClient.post<{ data: Incident }>("/incidents", data).then((r) => r.data.data);

export const updateIncidentStatus = (id: string, status: string) =>
  apiClient.patch<{ data: Incident }>(`/incidents/${id}/status`, { status }).then((r) => r.data.data);

export const checkWeatherRisk = (lat: number, lng: number, address: string) =>
  apiClient
    .post<{ data: WeatherCheckResponse }>("/incidents/check-weather", { lat, lng, address })
    .then((r) => r.data.data);

// Recommendations
export const fetchRecommendations = (params?: Record<string, string>) =>
  apiClient
    .get<{ data: { recommendations: Recommendation[] } }>("/recommendations", { params })
    .then((r) => r.data.data.recommendations);

export const generateRecommendations = (incidentId: string, patientIds: string[] = []) =>
  apiClient
    .post<{ data: AllocationPlan }>("/recommendations/generate", { incidentId, patientIds })
    .then((r) => r.data.data);

export const approveRecommendation = (id: string) =>
  apiClient
    .post<{ data: ApprovalResult }>(`/recommendations/${id}/approve`)
    .then((r) => r.data.data);

export const overrideRecommendation = (id: string, reason: string) =>
  apiClient
    .post<{ data: Recommendation }>(`/recommendations/${id}/override`, { reason })
    .then((r) => r.data.data);
