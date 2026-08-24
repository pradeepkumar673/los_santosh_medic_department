import { create } from "zustand";
import {
  Hospital,
  Incident,
  Recommendation,
  VentilatorStatus,
  VentilatorRiskResult,
  WeatherRiskResult,
  AllocationPlan,
  ApprovalResult,
  Resource,
  fetchHospitals,
  fetchIncidents,
  fetchRecommendations,
  fetchVentilatorStatus,
  fetchVentilatorRisk,
  checkWeatherRisk as apiCheckWeather,
  generateRecommendations as apiGenerate,
  approveRecommendation as apiApprove,
  overrideRecommendation as apiOverride,
  createIncident as apiCreateIncident,
  updateIncidentStatus as apiUpdateStatus,
  fetchResources,
} from "../services/emergencyApi";

interface EmergencyState {
  /* data */
  hospitals: Hospital[];
  incidents: Incident[];
  recommendations: Recommendation[];
  ventilatorStatuses: Record<string, VentilatorStatus>;
  ventilatorRisks: Record<string, VentilatorRiskResult>;
  weatherRisk: WeatherRiskResult | null;
  weatherAutoIncident: Incident | null;
  allocationPlan: AllocationPlan | null;
  resources: Resource[];

  /* ui */
  loading: boolean;
  error: string | null;

  /* actions */
  loadHospitals: () => Promise<void>;
  loadIncidents: () => Promise<void>;
  loadRecommendations: (filter?: Record<string, string>) => Promise<void>;
  loadResources: (hospitalId?: string, type?: string) => Promise<void>;
  loadVentilatorStatus: (hospitalId: string) => Promise<void>;
  loadVentilatorRisk: (
    hospitalId: string,
    arrivals?: number,
    window?: number
  ) => Promise<void>;
  checkWeather: (
    lat: number,
    lng: number,
    address: string
  ) => Promise<void>;
  generatePlan: (
    incidentId: string,
    patientIds?: string[]
  ) => Promise<AllocationPlan>;
  approve: (id: string) => Promise<ApprovalResult>;
  override: (id: string, reason: string) => Promise<Recommendation>;
  createNewIncident: (data: Partial<Incident>) => Promise<Incident>;
  changeIncidentStatus: (id: string, status: string) => Promise<void>;
  clearError: () => void;
}

export const useEmergencyStore = create<EmergencyState>((set, get) => ({
  hospitals: [],
  incidents: [],
  recommendations: [],
  ventilatorStatuses: {},
  ventilatorRisks: {},
  weatherRisk: null,
  weatherAutoIncident: null,
  allocationPlan: null,
  resources: [],
  loading: false,
  error: null,

  loadHospitals: async () => {
    set({ loading: true, error: null });
    try {
      const hospitals = await fetchHospitals();
      set({ hospitals, loading: false });
    } catch (e: any) {
      set({ error: e?.response?.data?.message || "Failed to load hospitals", loading: false });
    }
  },

  loadIncidents: async () => {
    set({ loading: true, error: null });
    try {
      const incidents = await fetchIncidents();
      set({ incidents, loading: false });
    } catch (e: any) {
      set({ error: e?.response?.data?.message || "Failed to load incidents", loading: false });
    }
  },

  loadRecommendations: async (filter) => {
    set({ loading: true, error: null });
    try {
      const recommendations = await fetchRecommendations(filter);
      set({ recommendations, loading: false });
    } catch (e: any) {
      set({
        error: e?.response?.data?.message || "Failed to load recommendations",
        loading: false,
      });
    }
  },

  loadResources: async (hospitalId, type) => {
    set({ loading: true, error: null });
    try {
      const resources = await fetchResources(hospitalId, type);
      set({ resources, loading: false });
    } catch (e: any) {
      set({ error: e?.response?.data?.message || "Failed to load resources", loading: false });
    }
  },

  loadVentilatorStatus: async (hospitalId) => {
    try {
      const status = await fetchVentilatorStatus(hospitalId);
      set((s) => ({
        ventilatorStatuses: { ...s.ventilatorStatuses, [hospitalId]: status },
      }));
    } catch (e: any) {
      set({ error: e?.response?.data?.message || "Failed to load ventilator status" });
    }
  },

  loadVentilatorRisk: async (hospitalId, arrivals = 0, window = 60) => {
    try {
      const risk = await fetchVentilatorRisk(hospitalId, arrivals, window);
      set((s) => ({
        ventilatorRisks: { ...s.ventilatorRisks, [hospitalId]: risk },
      }));
    } catch (e: any) {
      set({ error: e?.response?.data?.message || "Failed to load ventilator risk" });
    }
  },

  checkWeather: async (lat, lng, address) => {
    set({ loading: true, error: null, weatherAutoIncident: null });
    try {
      const result = await apiCheckWeather(lat, lng, address);
      set({
        weatherRisk: result.risk,
        weatherAutoIncident: result.incident ?? null,
        loading: false,
      });
      if (result.created) {
        await get().loadIncidents();
      }
    } catch (e: any) {
      set({ error: e?.response?.data?.message || "Weather check failed", loading: false });
    }
  },

  generatePlan: async (incidentId, patientIds = []) => {
    set({ loading: true, error: null });
    try {
      const plan = await apiGenerate(incidentId, patientIds);
      set({ allocationPlan: plan, loading: false });
      await get().loadRecommendations({ incidentId });
      return plan;
    } catch (e: any) {
      set({ error: e?.response?.data?.message || "Plan generation failed", loading: false });
      throw e;
    }
  },

  approve: async (id) => {
    set({ loading: true, error: null });
    try {
      const result = await apiApprove(id);
      await get().loadRecommendations();
      set({ loading: false });
      return result;
    } catch (e: any) {
      set({ error: e?.response?.data?.message || "Approval failed", loading: false });
      throw e;
    }
  },

  override: async (id, reason) => {
    set({ loading: true, error: null });
    try {
      const rec = await apiOverride(id, reason);
      await get().loadRecommendations();
      set({ loading: false });
      return rec;
    } catch (e: any) {
      set({ error: e?.response?.data?.message || "Override failed", loading: false });
      throw e;
    }
  },

  createNewIncident: async (data) => {
    set({ loading: true, error: null });
    try {
      const incident = await apiCreateIncident(data);
      await get().loadIncidents();
      set({ loading: false });
      return incident;
    } catch (e: any) {
      set({ error: e?.response?.data?.message || "Failed to create incident", loading: false });
      throw e;
    }
  },

  changeIncidentStatus: async (id, status) => {
    set({ loading: true, error: null });
    try {
      await apiUpdateStatus(id, status);
      await get().loadIncidents();
      set({ loading: false });
    } catch (e: any) {
      set({ error: e?.response?.data?.message || "Status update failed", loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
