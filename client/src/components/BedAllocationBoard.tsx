import { useState, useCallback } from "react";
import { useBeds, BedStatusChangedPayload, BedOccupancy } from "../hooks/useBeds";

type BedRecord = {
  _id: string;
  bedNumber: string;
  ward: string;
  floor: number;
  bedType: string;
  status: "vacant" | "occupied" | "cleaning" | "maintenance";
  pricePerDay: number;
  currentPatient?: { user?: { name?: string; phone?: string } };
  department?: { name: string };
  assignedAt?: string;
  expectedDischargeDate?: string;
};

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  vacant: { bg: "bg-emerald-900/40", text: "text-emerald-400", dot: "bg-emerald-400" },
  occupied: { bg: "bg-rose-900/40", text: "text-rose-400", dot: "bg-rose-400" },
  cleaning: { bg: "bg-amber-900/40", text: "text-amber-400", dot: "bg-amber-400" },
  maintenance: { bg: "bg-slate-700/40", text: "text-slate-400", dot: "bg-slate-400" },
};

const BED_TYPE_ICON: Record<string, string> = {
  general: "🛏️",
  icu: "❤️‍🩹",
  emergency: "🚨",
  private: "🏠",
  pediatric: "🧸",
  maternity: "🤱",
};

type Props = { departmentId: string; initialBeds?: BedRecord[] };

export default function BedAllocationBoard({ departmentId, initialBeds = [] }: Props) {
  const [beds, setBeds] = useState<BedRecord[]>(initialBeds);
  const [occupancy, setOccupancy] = useState<BedOccupancy>({
    vacant: 0,
    occupied: 0,
    cleaning: 0,
    maintenance: 0,
  });
  const [lastAction, setLastAction] = useState<string>("");

  const onBedStatusChanged = useCallback((payload: BedStatusChangedPayload) => {
    setOccupancy(payload.occupancy);
    setLastAction(
      `${payload.action.replace("_", " ")} — ${new Date(payload.updatedAt).toLocaleTimeString()}`
    );

    if (!payload.bed) return;
    const updated = payload.bed as unknown as BedRecord;

    setBeds((prev) => {
      const exists = prev.findIndex((b) => b._id === updated._id);
      if (payload.action === "deleted") return prev.filter((b) => b._id !== updated._id);
      if (exists >= 0) {
        const next = [...prev];
        next[exists] = updated;
        return next;
      }
      return [...prev, updated];
    });
  }, []);

  useBeds({ departmentId, onBedStatusChanged });

  const statCards = [
    { label: "Vacant", count: occupancy.vacant, key: "vacant" },
    { label: "Occupied", count: occupancy.occupied, key: "occupied" },
    { label: "Cleaning", count: occupancy.cleaning, key: "cleaning" },
    { label: "Maintenance", count: occupancy.maintenance, key: "maintenance" },
  ];

  const byStatus = (s: string) => beds.filter((b) => b.status === s);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 font-sans">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bed Allocation</h1>
          <p className="text-xs text-gray-500 mt-0.5">Live · updates without refresh</p>
        </div>
        {lastAction && (
          <span className="text-xs text-gray-400 bg-gray-800 px-3 py-1.5 rounded-full">
            ↻ {lastAction}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {statCards.map(({ label, count, key }) => {
          const style = STATUS_STYLE[key];
          return (
            <div key={key} className={`rounded-xl p-4 ${style.bg} border border-white/5`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                <span className={`text-xs font-semibold uppercase tracking-widest ${style.text}`}>
                  {label}
                </span>
              </div>
              <span className="text-4xl font-black">{count}</span>
            </div>
          );
        })}
      </div>

      {(["occupied", "vacant", "cleaning", "maintenance"] as const).map((statusKey) => {
        const group = byStatus(statusKey);
        if (group.length === 0) return null;
        const style = STATUS_STYLE[statusKey];

        return (
          <section key={statusKey} className="mb-10">
            <h2 className={`text-sm font-semibold uppercase tracking-widest mb-4 ${style.text}`}>
              {statusKey} ({group.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {group.map((bed) => (
                <BedCard key={bed._id} bed={bed} />
              ))}
            </div>
          </section>
        );
      })}

      {beds.length === 0 && (
        <p className="text-gray-600 text-sm text-center py-20">
          No beds loaded. Fetch beds from the API and pass them as `initialBeds`.
        </p>
      )}
    </div>
  );
}

function BedCard({ bed }: { bed: BedRecord }) {
  const style = STATUS_STYLE[bed.status];

  return (
    <div className={`rounded-xl p-4 border border-white/5 ${style.bg} flex flex-col gap-3`}>
      <div className="flex items-start justify-between">
        <div>
          <span className="text-lg font-bold">
            {BED_TYPE_ICON[bed.bedType]} {bed.bedNumber}
          </span>
          <p className="text-xs text-gray-400">
            {bed.ward} · Floor {bed.floor}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${style.text} bg-black/20`}>
          {bed.status.toUpperCase()}
        </span>
      </div>

      {bed.status === "occupied" && bed.currentPatient?.user && (
        <div className="bg-black/20 rounded-lg px-3 py-2 text-sm">
          <p className="font-semibold text-white">{bed.currentPatient.user.name ?? "—"}</p>
          <p className="text-gray-400 text-xs">{bed.currentPatient.user.phone ?? ""}</p>
          {bed.assignedAt && (
            <p className="text-gray-500 text-xs mt-1">
              Since {new Date(bed.assignedAt).toLocaleDateString()}
            </p>
          )}
          {bed.expectedDischargeDate && (
            <p className="text-gray-500 text-xs">
              Expected discharge: {new Date(bed.expectedDischargeDate).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-1 border-t border-white/5">
        <span className="text-xs text-gray-500 capitalize">{bed.bedType}</span>
        <span className="text-xs text-gray-400">₹{bed.pricePerDay}/day</span>
      </div>
    </div>
  );
}
