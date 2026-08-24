import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Syringe,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useEmergencyStore } from "../../store/emergencyStore";
import type { Hospital, VentilatorRiskResult, VentilatorStatus } from "../../services/emergencyApi";

const RISK_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  Low: { bg: "bg-green-50", text: "text-green-700", ring: "stroke-green-500" },
  Medium: { bg: "bg-yellow-50", text: "text-yellow-700", ring: "stroke-yellow-500" },
  High: { bg: "bg-orange-50", text: "text-orange-700", ring: "stroke-orange-500" },
  Critical: { bg: "bg-red-50", text: "text-red-700", ring: "stroke-red-500" },
};

export default function VentilatorDashboard() {
  const navigate = useNavigate();
  const {
    hospitals,
    ventilatorStatuses,
    ventilatorRisks,
    resources,
    loading,
    loadHospitals,
    loadVentilatorStatus,
    loadVentilatorRisk,
    loadResources,
  } = useEmergencyStore();

  const [arrivals, setArrivals] = useState(2);
  const [window, setWindow] = useState(60);
  const [refreshing, setRefreshing] = useState(false);

  const bootstrap = async () => {
    setRefreshing(true);
    await loadHospitals();
    await loadResources(undefined, "ventilator");
    setRefreshing(false);
  };

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    hospitals.forEach((h) => {
      loadVentilatorStatus(h._id);
      loadVentilatorRisk(h._id, arrivals, window);
    });
  }, [hospitals, arrivals, window]);

  const networkTotals = useMemo(() => {
    let total = 0,
      availNow = 0,
      occupied = 0,
      avail30 = 0,
      avail60 = 0;
    Object.values(ventilatorStatuses).forEach((s) => {
      total += s.total;
      availNow += s.availableNow;
      occupied += s.occupied;
      avail30 += s.expectedAvailableIn30;
      avail60 += s.expectedAvailableIn60;
    });
    return { total, availNow, occupied, avail30, avail60 };
  }, [ventilatorStatuses]);

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/emergency")}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Syringe className="h-6 w-6 text-teal-600" />
              Regional Ventilator Inventory & Shortage Forecaster
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live tracking across all network hospitals with turnaround-time prediction algorithms
            </p>
          </div>
        </div>
        <button
          onClick={bootstrap}
          disabled={refreshing || loading}
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

      {/* Network totals bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <NetStat label="Total Inventory" value={networkTotals.total} />
        <NetStat label="Available Now" value={networkTotals.availNow} color="text-green-600" />
        <NetStat label="Currently Occupied" value={networkTotals.occupied} color="text-red-500" />
        <NetStat label="Predicted +30m" value={networkTotals.avail30} color="text-blue-600" />
        <NetStat label="Predicted +60m" value={networkTotals.avail60} color="text-teal-600" />
      </div>

      {/* Simulation panel */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-teal-600" />
          <div>
            <p className="text-xs font-bold text-slate-800">Shortage Risk Simulator</p>
            <p className="text-[11px] text-slate-500">
              Adjust expected critical arrivals and time window to simulate network load
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium">Arrivals:</label>
            <input
              type="number"
              min={0}
              max={50}
              value={arrivals}
              onChange={(e) => setArrivals(Number(e.target.value))}
              className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs text-center font-bold focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium">Window (min):</label>
            <select
              value={window}
              onChange={(e) => setWindow(Number(e.target.value))}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
              <option value={120}>120 min</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hospital cards list */}
      <div className="space-y-4">
        {hospitals.map((h) => (
          <HospitalVentilatorCard
            key={h._id}
            hospital={h}
            vents={resources.filter((r) => r.hospitalId === h._id && r.type === "ventilator")}
            status={ventilatorStatuses[h._id]}
            risk={ventilatorRisks[h._id]}
          />
        ))}
      </div>
    </div>
  );
}

function NetStat({
  label,
  value,
  color = "text-slate-800",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">{label}</p>
    </div>
  );
}

function HospitalVentilatorCard({
  hospital,
  vents,
  status,
  risk,
}: {
  hospital: Hospital;
  vents: any[];
  status?: VentilatorStatus;
  risk?: VentilatorRiskResult;
}) {
  const riskStyle = risk ? RISK_COLORS[risk.riskLevel] ?? RISK_COLORS.Low : null;
  const shortagePct = risk ? Math.round(risk.shortageProbability * 100) : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Hospital Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            {hospital.name}{" "}
            <span className="text-xs font-normal text-slate-400">({hospital.code})</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Trauma Level {hospital.traumaLevel} • {hospital.location.address}
          </p>
        </div>
        {risk && riskStyle && (
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${riskStyle.bg} ${riskStyle.text}`}
          >
            {risk.riskLevel} risk
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        {/* Status Table */}
        <div className="lg:col-span-1 p-4">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase mb-2">Current Status</h4>
          {status ? (
            <div className="space-y-1.5 text-sm">
              <Row label="Total" value={status.total} />
              <Row label="Available Now" value={status.availableNow} highlight={status.availableNow === 0 ? "red" : "green"} />
              <Row label="Occupied" value={status.occupied} />
              <Row label="Reserved" value={status.reserved} />
              <Row label="Maintenance" value={status.maintenance} />
              <Row label="Expected +30 min" value={status.expectedAvailableIn30} />
              <Row label="Expected +60 min" value={status.expectedAvailableIn60} />
            </div>
          ) : (
            <p className="text-xs text-slate-400">Loading...</p>
          )}
        </div>

        {/* Individual ventilator units */}
        <div className="lg:col-span-1 p-4">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase mb-2">
            Unit Details ({vents.length})
          </h4>
          {vents.length === 0 ? (
            <p className="text-xs text-slate-400">No unit-level data</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {vents.map((v, idx) => (
                <div
                  key={v._id}
                  className="flex items-center justify-between text-xs rounded-lg bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        v.available > 0 ? "bg-green-500" : "bg-red-400"
                      }`}
                    />
                    <span className="font-medium text-slate-700">
                      Unit #{idx + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    {v.expectedReleaseTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(v.expectedReleaseTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    {v.releaseConfidence != null && (
                      <span className="font-semibold">
                        {Math.round(v.releaseConfidence * 100)}%
                      </span>
                    )}
                    <span
                      className={`font-bold ${
                        v.available > 0 ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {v.available > 0 ? "AVAIL" : "IN USE"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Risk + Actions */}
        <div className="lg:col-span-1 p-4">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase mb-2">
            Shortage Risk Analysis
          </h4>
          {risk ? (
            <div className="space-y-3">
              {/* Gauge */}
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 flex-shrink-0">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      className={riskStyle?.ring ?? "stroke-slate-400"}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${shortagePct} ${100 - shortagePct}`}
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-sm font-black ${riskStyle?.text ?? "text-slate-600"}`}>
                    {shortagePct}%
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-0.5">
                  <p>Supply: <strong>{risk.projectedSupplyInWindow}</strong></p>
                  <p>Demand: <strong>{risk.expectedDemand}</strong></p>
                  <p>Window: <strong>{risk.timeWindowMinutes} min</strong></p>
                </div>
              </div>

              {/* Actions */}
              {risk.recommendedActions.length > 0 && (
                <div className="space-y-1">
                  {risk.recommendedActions.map((action, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-1.5 text-[11px] text-slate-600"
                    >
                      {risk.riskLevel === "Critical" || risk.riskLevel === "High" ? (
                        <AlertTriangle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                      )}
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Pending analysis...</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: "red" | "green";
}) {
  const valColor = highlight === "red" ? "text-red-600 font-bold" : highlight === "green" ? "text-green-600 font-bold" : "text-slate-700 font-semibold";
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs ${valColor}`}>{value}</span>
    </div>
  );
}
