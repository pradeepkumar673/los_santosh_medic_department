import mongoose from 'mongoose';
import Incident, { IIncident, IncidentSeverity } from '../models/Incident.model';
import { getWeatherRisk } from './weather.service';
import { ApiError } from '../utils/ApiError';
import { getIO, ROOMS } from '../config/socket';

export const createIncident = async (
  data: Partial<IIncident>,
  createdBy: string
): Promise<IIncident> => {
  const incident = await Incident.create({
    ...data,
    createdBy: new mongoose.Types.ObjectId(createdBy),
    status: data.status || 'monitoring',
  });
  
  try {
    const io = getIO();
    io.to(ROOMS.emergencyCommand).emit('incident-created', { incident });
    io.to(ROOMS.adminDashboard).emit('incident-created', { incident });
  } catch (e) {
    console.error('Failed to emit incident-created', e);
  }
  
  return incident;
};

export const getIncidents = async (filter: any = {}): Promise<IIncident[]> => {
  return Incident.find(filter).sort({ createdAt: -1 }).limit(50);
};

export const getIncidentById = async (id: string): Promise<IIncident> => {
  const incident = await Incident.findById(id);
  if (!incident) throw ApiError.notFound('Incident not found');
  return incident;
};

export const updateIncidentStatus = async (
  id: string,
  status: string,
  userId: string
): Promise<IIncident> => {
  const incident = await Incident.findById(id);
  if (!incident) throw ApiError.notFound('Incident not found');
  incident.status = status as any;
  await incident.save();
  
  try {
    const io = getIO();
    io.to(ROOMS.emergencyCommand).emit('incident-updated', { incident });
    io.to(ROOMS.adminDashboard).emit('incident-updated', { incident });
  } catch (e) {
    console.error('Failed to emit incident-updated', e);
  }
  
  return incident;
};

export const checkWeatherAndAutoCreate = async (
  lat: number,
  lng: number,
  locationAddress: string,
  createdBy: string
): Promise<{ incident?: IIncident; risk: any; created: boolean }> => {
  const risk = await getWeatherRisk(lat, lng);
  
  if (risk.disasterRiskScore >= 50) {
    const severityMap: Record<string, IncidentSeverity> = {
      low: 'low',
      moderate: 'medium',
      high: 'high',
      very_high: 'critical',
      critical: 'critical'
    };
    
    const incident = await Incident.create({
      eventType: `Weather Alert: ${risk.riskLevel} risk`,
      location: {
        address: locationAddress,
        coordinates: {
          type: 'Point',
          coordinates: [lng, lat]
        }
      },
      severity: severityMap[risk.riskLevel] || 'medium',
      reportedCasualties: 0,
      confidenceScore: Math.min(1, risk.disasterRiskScore / 100),
      source: 'Auto-Weather-System',
      status: 'monitoring',
      weatherLinked: true,
      predictedArrivals: 0,
      createdBy: new mongoose.Types.ObjectId(createdBy)
    });
    
    try {
      const io = getIO();
      io.to(ROOMS.emergencyCommand).emit('incident-created', { incident });
      io.to(ROOMS.adminDashboard).emit('incident-created', { incident });
    } catch (e) {
      console.error('Failed to emit weather incident-created', e);
    }
    
    return { incident, risk, created: true };
  }
  
  return { risk, created: false };
};
