import axios from "axios";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";

export type AppointmentType = "scheduled" | "follow_up" | "walk_in" | "emergency";

export interface NoShowPredictionInput {
  age: number;
  past_no_shows: number;
  total_past_appointments: number;
  distance_km: number;
  lead_time_days: number;
  day_of_week: string;   // "Monday".."Sunday"
  time_slot: "Morning" | "Afternoon" | "Evening";
  department: string;
  appointment_type: AppointmentType;
}

export interface NoShowPredictionResult {
  will_no_show: boolean;
  no_show_probability: number;
  risk_level: "Low" | "Medium" | "High";
  recommended_action: string;
  model_version: string;
}

/**
 * Calls the Python FastAPI microservice.
 * Why a fallback: if the ML service is down, appointment booking and
 * queue flows must NOT break — we degrade gracefully to "unknown" risk
 * instead of throwing.
 */
export async function getNoShowPrediction(
  input: NoShowPredictionInput
): Promise<NoShowPredictionResult | null> {
  try {
    const { data } = await axios.post<NoShowPredictionResult>(
      `${ML_SERVICE_URL}/predict-no-show`,
      input,
      { timeout: 3000 }
    );
    return data;
  } catch (err) {
    console.error("[noShowPrediction] ML service unreachable:", (err as Error).message);
    return null; // caller decides how to handle a null risk
  }
}

export async function getBatchNoShowPredictions(
  appointments: NoShowPredictionInput[]
): Promise<NoShowPredictionResult[] | null> {
  try {
    const { data } = await axios.post<{ results: (NoShowPredictionResult & { index: number })[] }>(
      `${ML_SERVICE_URL}/predict-no-show/batch`,
      { appointments },
      { timeout: 5000 }
    );
    return data.results.sort((a, b) => a.index - b.index);
  } catch (err) {
    console.error("[noShowPrediction] batch call failed:", (err as Error).message);
    return null;
  }
}
