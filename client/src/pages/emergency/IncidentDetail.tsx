import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  Siren,
  MapPin,
  Users,
  BarChart3,
  Clock,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { useEmergencyStore } from "../../store/emergencyStore";
import RecommendationCard from "../../components/emergency/RecommendationCard";
import { fetchIncidentById, type Incident } from "../../services/emergencyApi";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-600",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

const STATUS_ACTIONS: Record<string, { label: string; next: string; color: string }[]> = {
  monitoring: [
    { label: "Activate", next: "active", color: "bg-red-600 hover:bg-red-700" },
    { label: "Resolve", next: "resolved", color: "bg-green-600 hover:bg-green-700" },
  ],
  active: [
    { label: "Resolve", next: "resolved", color: "bg-green-600 hover:bg-green-700" },
  ],
  resolved: [],
};

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    recommendations,
    allocationPlan,
    loading,
    loadRecommendations,
    generatePlan,
    changeIncidentStatus,
  } = useEmergencyStore();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loadingIncident, setLoadingIncident] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoadingIncident(true);
    try {
      const data = await fetchIncidentById(id);
      setIncident(data);
      await loadRecommendations({ incidentId: id });
    } catch {
      toast.error("Failed to load incident details");
    } finally {
      setLoadingIncident(false);
    }
  }, [id, loadRecommendations]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const plan = await generatePlan(id);
      toast.success(`Generated ${plan.recommendations.length} recommendations!`);
      await load();
    } catch {
      toast.error("Failed to generate recommendations");
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusChange = async (nextStatus: string) => {
    if (!id) return;
    try {
      await changeIncidentStatus(id, nextStatus);
      toast.success(`Incident status changed to ${nextStatus}`);
      await load();
    } catch {
      toast.error("Failed to update status");
    }
  };

  if (loadingIncident) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="py-16 text-center text-slate-500">
        Incident not found
      </div>
    );
  }

  const incidentRecs = recommendations.filter(
    (r) =>
      (typeof r.incidentId === "object" ? r.incidentId?._id : r.incidentId) === id
  );

  const actions = STATUS_ACTIONS[incident.status] ?? [];
  const confPct = Math.round(incident.confidenceScore * 100);

  return (
    <div className="space-y-6 pb-10">
      {/* Back button + Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/emergency")}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-800">
                {incident.eventType}
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase text-white ${
                  SEVERITY_COLORS[incident.severity] ?? "bg-slate-500"
                }`}
              >
                {incident.severity}
              </span>
              <StatusPill status={incident.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Reported by {incident.source} • ID: {incident._id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {actions.map((act) => (
            <button
              key={act.next}
              onClick={() => handleStatusChange(act.next)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors ${act.color}`}
            >
              {act.label}
            </button>
          ))}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Incident Details Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info panel */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Siren className="h-4 w-4 text-red-500" /> Incident Parameters
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <InfoRow icon={<MapPin className="h-4 w-4 text-slate-400" />} label="Location" value={incident.location.address} />
            <InfoRow icon={<Users className="h-4 w-4 text-slate-400" />} label="Reported Casualties" value={String(incident.reportedCasualties)} />
            <InfoRow icon={<Zap className="h-4 w-4 text-slate-400" />} label="Source" value={incident.source} />
            <InfoRow icon={<Clock className="h-4 w-4 text-slate-400" />} label="Created" value={new Date(incident.createdAt).toLocaleString()} />
          </div>
        </div>

        {/* AI Confidence + Predicted Arrivals */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col items-center justify-center gap-3">
          <div className="relative h-24 w-24">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                className={confPct >= 70 ? "stroke-green-500" : confPct >= 40 ? "stroke-yellow-500" : "stroke-red-500"}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${confPct} ${100 - confPct}`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-black text-slate-700">
              {confPct}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">
            Source Confidence
          </p>

          <div className="w-full border-t border-slate-100 pt-3 text-center">
            <p className="text-3xl font-black text-red-600">{incident.predictedArrivals}</p>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">
              Predicted Arrivals
            </p>
          </div>
        </div>
      </div>

      {/* Generate Recommendations */}
      {incident.status !== "resolved" && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 shadow-sm px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-teal-800">
              EmergencyFlow AI Allocation Engine
            </h3>
            <p className="text-xs text-teal-600 mt-0.5">
              Analyze all hospitals and generate ranked recommendations with full explanations
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || loading}
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-teal-700 disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4" />
            )}
            Generate Recommendations
          </button>
        </div>
      )}

      {/* Allocation Plan Summary */}
      {allocationPlan && allocationPlan.incident._id === id && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800">Hospital Ranking</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30 text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-2 text-left font-semibold">Rank</th>
                  <th className="px-4 py-2 text-left font-semibold">Hospital</th>
                  <th className="px-4 py-2 text-center font-semibold">Distance</th>
                  <th className="px-4 py-2 text-center font-semibold">Care Bundle</th>
                  <th className="px-4 py-2 text-center font-semibold">Load</th>
                  <th className="px-4 py-2 text-center font-semibold">Surge</th>
                  <th className="px-4 py-2 text-center font-semibold">Composite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {allocationPlan.ranking.map((entry) => (
                  <tr key={entry.hospitalId} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-black text-teal-600">#{entry.rank}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-slate-800">{entry.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {entry.distanceKm} km • ~{entry.travelMinutes} min
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <ScorePill value={entry.scores.distance} />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <ScorePill value={entry.scores.careBundle} />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <ScorePill value={entry.scores.currentLoad} />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <ScorePill value={entry.scores.surgeCapacity} />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-sm font-black text-slate-800">
                        {entry.scores.composite}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recommendation Cards */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3">
          Recommendations ({incidentRecs.length})
        </h3>
        {incidentRecs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-5 py-10 text-center text-sm text-slate-400">
            No recommendations yet — click "Generate Recommendations" above
          </div>
        ) : (
          <div className="space-y-4">
            {incidentRecs.map((rec) => (
              <RecommendationCard key={rec._id} rec={rec} onActionComplete={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* Sub-components */

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    monitoring: "bg-yellow-100 text-yellow-700 border-yellow-200",
    active: "bg-red-100 text-red-700 border-red-200",
    resolved: "bg-green-100 text-green-700 border-green-200",
  };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase ${styles[status] ?? styles.monitoring}`}>
      {status}
    </span>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">{label}</p>
        <p className="text-sm text-slate-700 font-medium">{value}</p>
      </div>
    </div>
  );
}

function ScorePill({ value }: { value: number }) {
  const color =
    value >= 75
      ? "bg-green-100 text-green-700"
      : value >= 50
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${color}`}>
      {value}
    </span>
  );
}
