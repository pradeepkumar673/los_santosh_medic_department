import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BedDouble,
  RefreshCw,
  Siren,
  Shield,
  Loader2,
  Plus,
  ChevronRight,
  Wind as WindIcon,
  FlaskConical,
} from "lucide-react";
import { useEmergencyStore } from "../../store/emergencyStore";
import WeatherRiskBanner from "../../components/emergency/WeatherRiskBanner";
import RecommendationCard from "../../components/emergency/RecommendationCard";
import type { Incident } from "../../services/emergencyApi";

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-300",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

const STATUS_STYLE: Record<string, { dot: string; text: string }> = {
  monitoring: { dot: "bg-yellow-400 animate-pulse", text: "text-yellow-700" },
  active: { dot: "bg-red-500 animate-pulse", text: "text-red-700" },
  resolved: { dot: "bg-green-500", text: "text-green-600" },
};

export default function CommandCenter() {
  const navigate = useNavigate();
  const {
    hospitals,
    incidents,
    recommendations,
    resources,
    loadHospitals,
    loadIncidents,
    loadRecommendations,
    loadResources,
  } = useEmergencyStore();

  const [refreshing, setRefreshing] = useState(false);

  const bootstrap = async () => {
    setRefreshing(true);
    await Promise.all([
      loadHospitals(),
      loadIncidents(),
      loadRecommendations(),
      loadResources(),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    bootstrap();
  }, []);

  const activeIncidents = useMemo(
    () => incidents.filter((i) => i.status !== "resolved"),
    [incidents]
  );
  const pendingRecs = useMemo(
    () => recommendations.filter((r) => r.status === "pending"),
    [recommendations]
  );

  const totalVent = useMemo(() => {
    const vents = resources.filter((r) => r.type === "ventilator");
    return vents.reduce((sum, r) => sum + r.total, 0);
  }, [resources]);

  const availVent = useMemo(() => {
    const vents = resources.filter((r) => r.type === "ventilator");
    return vents.reduce((sum, r) => sum + r.available, 0);
  }, [resources]);

  const ventUtilPct = totalVent > 0 ? Math.round(((totalVent - availVent) / totalVent) * 100) : 0;

  const networkScore = useMemo(() => {
    if (hospitals.length === 0) return 0;
    const base = 100 - activeIncidents.length * 15 - pendingRecs.length * 5;
    return Math.max(10, Math.min(100, base));
  }, [hospitals, activeIncidents, pendingRecs]);

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Siren className="h-6 w-6 text-red-500" />
            EmergencyFlow AI Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time disaster risk monitor, regional hospital load balancer, and AI care bundle allocator
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/emergency/simulator")}
            className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-colors"
          >
            <FlaskConical className="h-4 w-4" />
            What-If Simulator
          </button>
          <button
            onClick={() => navigate("/emergency/incidents/new")}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-red-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Incident
          </button>
          <button
            onClick={bootstrap}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Shield className="h-5 w-5 text-teal-600" />
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                networkScore >= 75
                  ? "bg-green-100 text-green-700"
                  : networkScore >= 50
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {networkScore}
            </span>
          </div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Network Readiness
          </p>
        </div>

        <StatCard
          icon={<Activity className="h-5 w-5 text-red-500" />}
          label="Active Incidents"
          value={activeIncidents.length}
          sub={`${incidents.length} total`}
          accent="red"
        />
        <StatCard
          icon={<Shield className="h-5 w-5 text-amber-500" />}
          label="Pending Approvals"
          value={pendingRecs.length}
          sub="recommendations"
          accent="amber"
        />
        <StatCard
          icon={<BedDouble className="h-5 w-5 text-blue-500" />}
          label="Ventilator Util."
          value={`${ventUtilPct}%`}
          sub={`${availVent}/${totalVent} available`}
          accent={ventUtilPct > 85 ? "red" : ventUtilPct > 65 ? "amber" : "green"}
        />
        <StatCard
          icon={<WindIcon className="h-5 w-5 text-teal-500" />}
          label="Hospitals"
          value={hospitals.length}
          sub="in network"
          accent="teal"
        />
      </div>

      {/* Ventilator shortage alert */}
      {ventUtilPct >= 80 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-800">
              Critical Ventilator Shortage Risk
            </p>
            <p className="text-xs text-red-600">
              Network ventilator utilization at {ventUtilPct}% — only {availVent} unit
              {availVent !== 1 && "s"} available across {hospitals.length} hospitals.
            </p>
          </div>
          <button
            onClick={() => navigate("/emergency/ventilators")}
            className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            View Dashboard <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Weather */}
      <WeatherRiskBanner />

      {/* Incidents + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active incidents */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-bold text-slate-800">Active Incidents</h2>
            <button
              onClick={() => navigate("/emergency/incidents/new")}
              className="flex items-center gap-1 text-xs text-teal-600 font-medium hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Create Incident
            </button>
          </div>
          {activeIncidents.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              No active incidents — network is stable
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {activeIncidents.map((inc) => (
                <IncidentRow
                  key={inc._id}
                  incident={inc}
                  onClick={() => navigate(`/emergency/incidents/${inc._id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-800">Quick Actions</h2>
            <QuickBtn
              label="Ventilator Dashboard"
              onClick={() => navigate("/emergency/ventilators")}
            />
            <QuickBtn
              label="View All Recommendations"
              onClick={() => navigate("/emergency/recommendations")}
            />
            <QuickBtn
              label="Check Weather Risk"
              onClick={() => {
                const el = document.getElementById("weather-cfg");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </div>

          {/* Pending recs */}
          {pendingRecs.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 shadow-sm p-5 space-y-3">
              <h2 className="text-sm font-bold text-amber-800">
                ⚡ {pendingRecs.length} Pending Recommendation
                {pendingRecs.length !== 1 && "s"}
              </h2>
              {pendingRecs.slice(0, 2).map((r) => (
                <RecommendationCard
                  key={r._id}
                  rec={r}
                  onActionComplete={bootstrap}
                />
              ))}
              {pendingRecs.length > 2 && (
                <button
                  onClick={() => navigate("/emergency/recommendations")}
                  className="text-xs text-amber-700 font-medium hover:underline"
                >
                  View all {pendingRecs.length} →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Sub-components */

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className={`text-2xl font-black text-${accent}-600`}>{value}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

function IncidentRow({
  incident,
  onClick,
}: {
  incident: Incident;
  onClick: () => void;
}) {
  const sev = SEVERITY_STYLE[incident.severity] ?? SEVERITY_STYLE.medium;
  const st = STATUS_STYLE[incident.status] ?? STATUS_STYLE.monitoring;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 transition-colors"
    >
      <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${st.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">
          {incident.eventType}
        </p>
        <p className="text-[11px] text-slate-400 truncate">
          {incident.location.address} • {incident.source}
        </p>
      </div>
      <span
        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${sev}`}
      >
        {incident.severity}
      </span>
      <span className="text-xs text-slate-400">
        {incident.reportedCasualties} cas.
      </span>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </button>
  );
}

function QuickBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition-colors"
    >
      {label}
      <ChevronRight className="h-3.5 w-3.5" />
    </button>
  );
}
