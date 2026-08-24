import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Loader2,
  FlaskConical,
  CheckCircle2,
  Zap,
  MapPin,
  Hospital as HospitalIcon,
  Wind,
  Siren,
} from "lucide-react";
import toast from "react-hot-toast";
import { useEmergencyStore } from "../../store/emergencyStore";
import type { Hospital, Resource } from "../../services/emergencyApi";

interface SimParams {
  extraCasualties: number;
  forceAllVentsOccupied: boolean;
  travelTimeMultiplier: number;
  closedHospitalId: string;
  incidentSeverity: "low" | "medium" | "high" | "critical";
}

interface StrategyResult {
  strategy: string;
  color: string;
  icon: React.ReactNode;
  targetHospital: Hospital | null;
  avgTravelMinutes: number;
  coverageScore: number;
  shortageProbability: number;
  recommendedActions: string[];
  explanation: string[];
}

export default function Simulator() {
  const navigate = useNavigate();
  const {
    hospitals,
    resources,
    loading,
    loadHospitals,
    loadResources,
  } = useEmergencyStore();

  const [params, setParams] = useState<SimParams>({
    extraCasualties: 5,
    forceAllVentsOccupied: false,
    travelTimeMultiplier: 1.0,
    closedHospitalId: "",
    incidentSeverity: "high",
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const [results, setResults] = useState<StrategyResult[] | null>(null);
  const [incidentLat] = useState(13.067);
  const [incidentLng] = useState(80.237);

  useEffect(() => {
    loadHospitals();
    loadResources();
  }, []);

  const set = <K extends keyof SimParams>(key: K, value: SimParams[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  const activeHospitals = useMemo(
    () => hospitals.filter((h) => h.isActive && h._id !== params.closedHospitalId),
    [hospitals, params.closedHospitalId]
  );

  const resourcesByHospital = useMemo(() => {
    const map: Record<string, Resource[]> = {};
    for (const r of resources) {
      if (!map[r.hospitalId]) map[r.hospitalId] = [];
      map[r.hospitalId].push(r);
    }
    return map;
  }, [resources]);

  const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const runSimulation = async () => {
    if (activeHospitals.length === 0) {
      toast.error("No active hospitals available for simulation");
      return;
    }

    setIsSimulating(true);
    await new Promise((r) => setTimeout(r, 800));

    try {
      const demand = params.extraCasualties;
      const AVG_SPEED = 32 / params.travelTimeMultiplier;

      const scoredHospitals = activeHospitals.map((h) => {
        const distKm = haversineKm(incidentLat, incidentLng, h.location.lat, h.location.lng);
        const travelMin = (distKm / AVG_SPEED) * 60;

        const hResources = resourcesByHospital[h._id] || [];
        const vents = hResources.filter((r) => r.type === "ventilator");
        const icuBeds = hResources.filter((r) => r.type === "icu_bed");
        const emerBeds = hResources.filter((r) => r.type === "emergency_bed");

        let ventAvailable = vents.reduce((s, v) => s + v.available, 0);
        const icuAvailable = icuBeds.reduce((s, b) => s + b.available, 0);
        const emerAvailable = emerBeds.reduce((s, b) => s + b.available, 0);

        if (params.forceAllVentsOccupied) ventAvailable = 0;

        const ventNeed = Math.max(1, Math.ceil(demand * 0.3));
        const icuNeed = Math.max(1, Math.ceil(demand * 0.25));
        const emerNeed = Math.max(1, Math.ceil(demand * 0.5));

        const ventScore = Math.min(1, ventAvailable / ventNeed);
        const icuScore = Math.min(1, icuAvailable / icuNeed);
        const emerScore = Math.min(1, emerAvailable / emerNeed);

        const careBundle = (ventScore * 0.4 + icuScore * 0.3 + emerScore * 0.3) * 100;
        const distanceScore = Math.max(0, 100 * (1 - travelMin / 60));

        const composite = distanceScore * 0.35 + careBundle * 0.65;

        const projectedSupply = ventAvailable + icuAvailable;
        const shortageProb =
          demand > 0
            ? Math.min(0.99, Math.max(0.05, 0.3 + (1 - projectedSupply / demand) * 0.7))
            : 0.05;

        return {
          hospital: h,
          distKm,
          travelMin,
          ventAvailable,
          icuAvailable,
          emerAvailable,
          careBundle,
          distanceScore,
          composite,
          shortageProb,
        };
      });

      // Strategy 1: Nearest Hospital
      const nearest = [...scoredHospitals].sort((a, b) => a.travelMin - b.travelMin)[0];

      // Strategy 2: EmergencyFlow AI (composite score)
      const aiBest = [...scoredHospitals].sort((a, b) => b.composite - a.composite)[0];

      const buildActions = (h: typeof nearest): string[] => {
        const actions: string[] = [];
        if (h.ventAvailable === 0) actions.push("⚠️ No ventilators available — surge protocol required");
        if (h.shortageProb > 0.6) actions.push("🚨 Activate regional transfer protocol");
        if (h.travelMin > 30) actions.push(`⏱ Long transport: ${Math.round(h.travelMin)} min`);
        if (h.careBundle < 50) actions.push("⚡ Resource bundle insufficient for predicted demand");
        return actions.length > 0 ? actions : ["✅ All systems within normal parameters"];
      };

      const buildExplanation = (h: typeof nearest, strategy: string): string[] => {
        const lines = [
          `Strategy: ${strategy}`,
          `Selected: ${h.hospital.name} (${h.hospital.code})`,
          `Distance: ${h.distKm.toFixed(1)} km • Travel: ${Math.round(h.travelMin)} min`,
          `Ventilators: ${h.ventAvailable} available`,
          `ICU Beds: ${h.icuAvailable} available`,
          `Care-bundle match: ${h.careBundle.toFixed(0)}/100`,
          `Composite score: ${h.composite.toFixed(1)}/100`,
        ];
        if (params.forceAllVentsOccupied) {
          lines.push("⚠️ Scenario: All ventilators forced to occupied status");
        }
        if (params.travelTimeMultiplier > 1) {
          lines.push(`🌧 Scenario: Travel time ×${params.travelTimeMultiplier} (flood/traffic)`);
        }
        return lines;
      };

      setResults([
        {
          strategy: "Nearest Hospital (Baseline)",
          color: "slate",
          icon: <MapPin className="h-5 w-5" />,
          targetHospital: nearest.hospital,
          avgTravelMinutes: Math.round(nearest.travelMin),
          coverageScore: Math.round(nearest.careBundle),
          shortageProbability: nearest.shortageProb,
          recommendedActions: buildActions(nearest),
          explanation: buildExplanation(nearest, "Nearest Hospital"),
        },
        {
          strategy: "EmergencyFlow AI (Recommended)",
          color: "teal",
          icon: <Zap className="h-5 w-5" />,
          targetHospital: aiBest.hospital,
          avgTravelMinutes: Math.round(aiBest.travelMin),
          coverageScore: Math.round(aiBest.careBundle),
          shortageProbability: aiBest.shortageProb,
          recommendedActions: buildActions(aiBest),
          explanation: buildExplanation(aiBest, "EmergencyFlow AI Composite Scoring"),
        },
      ]);

      toast.success("Simulation complete — compare strategies below");
    } catch (err) {
      toast.error("Simulation failed");
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  if (loading && hospitals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/emergency")} className="text-slate-400 hover:text-slate-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-purple-500" />
            What-If Scenario Simulator
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare allocation strategies under different disaster scenarios
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-5">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Siren className="h-4 w-4 text-red-500" />
              Incident Parameters
            </h2>

            <div>
              <label className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1.5">
                <span>Extra Casualties</span>
                <span className="text-teal-600 font-bold">{params.extraCasualties}</span>
              </label>
              <input
                type="range"
                min={1}
                max={50}
                value={params.extraCasualties}
                onChange={(e) => set("extraCasualties", Number(e.target.value))}
                className="w-full accent-teal-600"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Severity</label>
              <select
                value={params.incidentSeverity}
                onChange={(e) => set("incidentSeverity", e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 pt-3 border-t border-slate-100">
              <FlaskConical className="h-4 w-4 text-purple-500" />
              Stress Test Parameters
            </h2>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={params.forceAllVentsOccupied}
                onChange={(e) => set("forceAllVentsOccupied", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <div>
                <p className="text-xs font-medium text-slate-700">Force all ventilators occupied</p>
                <p className="text-[10px] text-slate-400">Simulates peak capacity stress</p>
              </div>
            </label>

            <div>
              <label className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1.5">
                <span className="flex items-center gap-1">
                  <Wind className="h-3 w-3" />
                  Travel Time Multiplier
                </span>
                <span className="text-teal-600 font-bold">×{params.travelTimeMultiplier.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={params.travelTimeMultiplier}
                onChange={(e) => set("travelTimeMultiplier", Number(e.target.value))}
                className="w-full accent-teal-600"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Simulates flood/traffic congestion (1× = normal, 3× = severe)
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block flex items-center gap-1">
                <HospitalIcon className="h-3 w-3" />
                Close One Hospital
              </label>
              <select
                value={params.closedHospitalId}
                onChange={(e) => set("closedHospitalId", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="">None (all active)</option>
                {hospitals.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name} ({h.code})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={runSimulation}
              disabled={isSimulating || activeHospitals.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-teal-600 px-4 py-3 text-sm font-bold text-white shadow hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isSimulating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running Simulation...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Simulation
                </>
              )}
            </button>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
            <p className="font-semibold mb-1">💡 How this works</p>
            <p className="leading-relaxed">
              The simulator runs two strategies on the same scenario:
              <br />
              <strong>1. Nearest Hospital</strong> — baseline geographic routing
              <br />
              <strong>2. EmergencyFlow AI</strong> — composite scoring using distance, care-bundle match,
              current load, and surge capacity
            </p>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {!results && !isSimulating && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-16 text-center">
              <FlaskConical className="h-16 w-16 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                Configure scenario parameters and click <strong>Run Simulation</strong> to compare
                allocation strategies
              </p>
            </div>
          )}

          {isSimulating && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-16 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-teal-500 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Running dual-strategy simulation...</p>
            </div>
          )}

          {results && (
            <>
              {/* Comparison Table */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="text-sm font-bold text-slate-800">Strategy Comparison</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/30 text-slate-500 uppercase text-[10px] tracking-wide">
                        <th className="px-4 py-2.5 text-left font-semibold">Metric</th>
                        {results.map((r) => (
                          <th key={r.strategy} className="px-4 py-2.5 text-center font-semibold">
                            {r.strategy}
                          </th>
                        ))}
                        <th className="px-4 py-2.5 text-center font-semibold">Winner</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      <CompareRow
                        label="Target Hospital"
                        values={results.map((r) => r.targetHospital?.name ?? "—")}
                        betterIdx={-1}
                      />
                      <CompareRow
                        label="Avg Travel Time"
                        values={results.map((r) => `${r.avgTravelMinutes} min`)}
                        betterIdx={results[0].avgTravelMinutes < results[1].avgTravelMinutes ? 0 : 1}
                      />
                      <CompareRow
                        label="Coverage Score"
                        values={results.map((r) => `${r.coverageScore}/100`)}
                        betterIdx={results[0].coverageScore > results[1].coverageScore ? 0 : 1}
                      />
                      <CompareRow
                        label="Shortage Probability"
                        values={results.map((r) => `${Math.round(r.shortageProbability * 100)}%`)}
                        betterIdx={
                          results[0].shortageProbability < results[1].shortageProbability ? 0 : 1
                        }
                      />
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Strategy Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((r, idx) => (
                  <StrategyCard key={r.strategy} result={r} isWinner={idx === 1} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CompareRow({
  label,
  values,
  betterIdx,
}: {
  label: string;
  values: string[];
  betterIdx: number;
}) {
  return (
    <tr className="hover:bg-slate-50/50">
      <td className="px-4 py-2.5 text-slate-600 font-medium">{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`px-4 py-2.5 text-center font-semibold ${
            i === betterIdx ? "text-teal-700 bg-teal-50/50" : "text-slate-700"
          }`}
        >
          {v}
        </td>
      ))}
      <td className="px-4 py-2.5 text-center">
        {betterIdx === -1 ? (
          <span className="text-slate-400">—</span>
        ) : betterIdx === 1 ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-100 rounded-full px-2 py-0.5">
            <Zap className="h-3 w-3" /> AI
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 rounded-full px-2 py-0.5">
            <MapPin className="h-3 w-3" /> Nearest
          </span>
        )}
      </td>
    </tr>
  );
}

function StrategyCard({ result, isWinner }: { result: StrategyResult; isWinner: boolean }) {
  const riskColor =
    result.shortageProbability >= 0.85
      ? "text-red-600 bg-red-50"
      : result.shortageProbability >= 0.6
      ? "text-orange-600 bg-orange-50"
      : result.shortageProbability >= 0.3
      ? "text-yellow-600 bg-yellow-50"
      : "text-green-600 bg-green-50";

  return (
    <div
      className={`rounded-xl border-2 bg-white shadow-sm overflow-hidden ${
        isWinner ? "border-teal-400" : "border-slate-200"
      }`}
    >
      <div
        className={`px-5 py-3 border-b flex items-center justify-between ${
          isWinner ? "bg-teal-50 border-teal-100" : "bg-slate-50 border-slate-100"
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              isWinner ? "bg-teal-500 text-white" : "bg-slate-500 text-white"
            }`}
          >
            {result.icon}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">{result.strategy}</p>
            {isWinner && (
              <p className="text-[10px] font-semibold text-teal-600">★ RECOMMENDED</p>
            )}
          </div>
        </div>
        {isWinner && <CheckCircle2 className="h-5 w-5 text-teal-500" />}
      </div>

      <div className="p-5 space-y-4">
        {/* Target */}
        <div>
          <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-1">
            Target Hospital
          </p>
          <p className="text-sm font-bold text-slate-800">{result.targetHospital?.name}</p>
          <p className="text-xs text-slate-400">{result.targetHospital?.code}</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Travel" value={`${result.avgTravelMinutes}m`} />
          <MiniStat label="Coverage" value={`${result.coverageScore}`} />
          <MiniStat
            label="Shortage"
            value={`${Math.round(result.shortageProbability * 100)}%`}
            className={riskColor}
          />
        </div>

        {/* Actions */}
        <div>
          <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-2">
            Recommended Actions
          </p>
          <div className="space-y-1">
            {result.recommendedActions.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-1.5 text-xs text-slate-600"
              >
                <span>{a}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Explanation */}
        <details className="group">
          <summary className="text-xs text-teal-600 font-medium cursor-pointer hover:underline">
            Show full reasoning
          </summary>
          <ul className="mt-2 space-y-1 text-[11px] text-slate-500 leading-relaxed pl-3 border-l-2 border-teal-200">
            {result.explanation.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-lg p-2 text-center bg-slate-50 ${className}`}>
      <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">{label}</p>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}
