import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Truck,
  BedDouble,
  Syringe,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Recommendation, Hospital } from "../../services/emergencyApi";
import { useEmergencyStore } from "../../store/emergencyStore";

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  allocation: { label: "Allocation", color: "bg-blue-100 text-blue-700" },
  transfer: { label: "Transfer", color: "bg-purple-100 text-purple-700" },
  reserve: { label: "Reserve", color: "bg-amber-100 text-amber-700" },
  preparedness: { label: "Preparedness", color: "bg-green-100 text-green-700" },
};

const STATUS_BADGE: Record<string, { color: string; dotColor: string }> = {
  pending: { color: "bg-yellow-50 text-yellow-700 border-yellow-200", dotColor: "bg-yellow-400" },
  approved: { color: "bg-green-50 text-green-700 border-green-200", dotColor: "bg-green-500" },
  rejected: { color: "bg-red-50 text-red-700 border-red-200", dotColor: "bg-red-400" },
  overridden: { color: "bg-slate-100 text-slate-600 border-slate-300", dotColor: "bg-slate-400" },
};

const RES_ICONS: Record<string, React.ReactNode> = {
  ventilator: <Syringe className="h-3.5 w-3.5" />,
  icu_bed: <BedDouble className="h-3.5 w-3.5" />,
  emergency_bed: <BedDouble className="h-3.5 w-3.5" />,
  ambulance: <Truck className="h-3.5 w-3.5" />,
};

interface Props {
  rec: Recommendation;
  onActionComplete?: () => void;
}

export default function RecommendationCard({ rec, onActionComplete }: Props) {
  const { approve, override } = useEmergencyStore();
  const [expanded, setExpanded] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [busy, setBusy] = useState(false);

  const typeBadge = TYPE_BADGE[rec.type] ?? TYPE_BADGE.allocation;
  const statusBadge = STATUS_BADGE[rec.status] ?? STATUS_BADGE.pending;

  const targetHosp =
    typeof rec.targetHospitalId === "object" && rec.targetHospitalId
      ? (rec.targetHospitalId as Hospital)
      : null;

  const hospitalName = targetHosp?.name ?? "Hospital";
  const hospitalCode = targetHosp?.code ?? "";

  const isPending = rec.status === "pending";

  const handleApprove = async () => {
    setBusy(true);
    try {
      const result = await approve(rec._id);
      toast.success(
        `Approved! ${result.actionResults.filter((a) => a.success).length}/${result.actionResults.length} resources committed.`
      );
      if (onActionComplete) onActionComplete();
    } catch {
      toast.error("Approval failed");
    } finally {
      setBusy(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideReason || overrideReason.trim().length < 5) return;
    setBusy(true);
    try {
      await override(rec._id, overrideReason.trim());
      toast.success("Recommendation overridden and logged");
      setShowOverrideModal(false);
      setOverrideReason("");
      if (onActionComplete) onActionComplete();
    } catch {
      toast.error("Override failed");
    } finally {
      setBusy(false);
    }
  };

  const confPct = Math.round(rec.confidence * 100);
  const confColor =
    confPct >= 75
      ? "bg-green-500"
      : confPct >= 50
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${typeBadge.color}`}
            >
              {typeBadge.label}
            </span>
            <span
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadge.color}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dotColor}`} />
              {rec.status}
            </span>
            {rec.humanApprovalRequired && isPending && (
              <span className="flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                <ShieldAlert className="h-3.5 w-3.5" /> Approval required
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400">
            {new Date(rec.createdAt).toLocaleString()}
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Hospital */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">
              Target Hospital
            </p>
            <p className="text-sm font-bold text-slate-800 mt-0.5">
              {hospitalName}{" "}
              {hospitalCode && (
                <span className="text-xs font-normal text-slate-400">({hospitalCode})</span>
              )}
            </p>
          </div>

          {/* Confidence gauge */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 font-medium">AI Confidence</span>
              <span className="text-xs font-bold text-slate-700">{confPct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${confColor}`}
                style={{ width: `${confPct}%` }}
              />
            </div>
          </div>

          {/* Resource requests */}
          {rec.resourceRequests.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {rec.resourceRequests.map((rr, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600"
                >
                  {RES_ICONS[rr.type] ?? <BedDouble className="h-3.5 w-3.5" />}
                  {rr.quantity}× {rr.type.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}

          {/* Explanation toggle */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Hide" : "Show"} full explanation ({rec.explanation.length} reasons)
          </button>
          {expanded && (
            <ul className="space-y-1 pl-4 border-l-2 border-teal-200 text-xs text-slate-600 leading-relaxed">
              {rec.explanation.map((line, idx) => (
                <li key={idx} className="relative before:absolute before:-left-[13px] before:top-[7px] before:h-1.5 before:w-1.5 before:rounded-full before:bg-teal-400">
                  {line}
                </li>
              ))}
            </ul>
          )}

          {/* Override reason if already overridden */}
          {rec.status === "overridden" && rec.overrideReason && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Override reason:</span>{" "}
              {rec.overrideReason}
            </div>
          )}
        </div>

        {/* Actions */}
        {isPending && (
          <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/40 px-5 py-3">
            <button
              onClick={handleApprove}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Approve
            </button>
            <button
              onClick={() => setShowOverrideModal(true)}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              Override
            </button>
          </div>
        )}
      </div>

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-6 py-4">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800">
                Override Recommendation
              </h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-xs text-slate-500">
                You are overriding the AI recommendation for{" "}
                <strong>{hospitalName}</strong>. A mandatory reason is required and will be
                permanently recorded in the audit log.
              </p>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={4}
                placeholder="Clinical justification for overriding this recommendation (min 5 chars)..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-3">
              <button
                onClick={() => {
                  setShowOverrideModal(false);
                  setOverrideReason("");
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleOverride}
                disabled={busy || overrideReason.trim().length < 5}
                className="flex items-center gap-1 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow hover:bg-amber-600 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
