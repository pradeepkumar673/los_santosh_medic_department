import axios from 'axios';
import { env } from '../config/env';

const ML_SERVICE_URL = env.ML_SERVICE_URL || process.env.ML_SERVICE_URL || 'http://localhost:8001';

export interface WeatherRiskResult {
  temperature: number;
  precipitation: number;
  wind_speed: number;
  weather_code: number;
  disasterRiskScore: number;
  riskLevel: string;
}

export async function getWeatherRisk(lat: number, lng: number): Promise<WeatherRiskResult> {
  try {
    const { data } = await axios.post<WeatherRiskResult>(
      `${ML_SERVICE_URL}/weather-risk`,
      { latitude: lat, longitude: lng },
      { timeout: 5000 }
    );
    return data;
  } catch (err: any) {
    console.error('[weather.service] Failed to fetch weather risk:', err.message);
    throw new Error('Failed to fetch weather risk data from ML service');
  }
}
