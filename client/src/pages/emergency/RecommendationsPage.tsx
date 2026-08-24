import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Loader2, Filter } from "lucide-react";
import { useEmergencyStore } from "../../store/emergencyStore";
import RecommendationCard from "../../components/emergency/RecommendationCard";

const STATUSES = ["all", "pending", "approved", "rejected", "overridden"] as const;

export default function RecommendationsPage() {
  const navigate = useNavigate();
  const { recommendations, loading, loadRecommendations } = useEmergencyStore();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = () => {
    const params: Record<string, string> = {};
    if (statusFilter !== "all") params.status = statusFilter;
    loadRecommendations(params);
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const filtered = statusFilter === "all"
    ? recommendations
    : recommendations.filter((r) => r.status === statusFilter);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/emergency")} className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-800">All Recommendations</h1>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-teal-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        <Filter className="h-4 w-4 text-slate-400 mr-1" />
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              statusFilter === s
                ? "bg-teal-600 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-5 py-16 text-center text-sm text-slate-400">
          No recommendations found
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rec) => (
            <RecommendationCard key={rec._id} rec={rec} onActionComplete={load} />
          ))}
        </div>
      )}
    </div>
  );
}
