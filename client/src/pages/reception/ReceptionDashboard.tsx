import { useState, useEffect, useCallback, useMemo } from "react";
import apiClient from "../../services/api.client";
import { useRealtimeQueue } from "../../hooks/useRealtimeQueue";
import { useRealtimeBeds } from "../../hooks/useRealtimeBeds";
import { useRealtimeAppointments } from "../../hooks/useRealtimeAppointments";
import {
  QueueUpdatedPayload,
  BedStatusChangedPayload,
  NewAppointmentPayload,
  PatientStatusChangedPayload,
} from "../../services/socket.service";

// ---------------------------------------------------------------------------
// Types — these mirror only the fields this page actually renders. The real
// API responses are richer (fully populated documents); we don't need that
// detail here, just IDs, labels, and statuses.
// ---------------------------------------------------------------------------

type Ref<T> = T | string; // a populated sub-document, or just its raw ObjectId

interface ApiDepartment {
  _id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface ApiQueueEntry {
  _id: string;
  tokenNumber: number;
  status: "waiting" | "called" | "in_progress" | "completed" | "skipped" | "cancelled";
  priority: "emergency" | "high" | "normal" | "low";
  positionInQueue: number;
  estimatedWaitMinutes: number;
  doctor: Ref<{ _id: string; specialization?: string; availabilityStatus?: string }>;
  department: Ref<{ _id: string; name?: string; code?: string }>;
}

interface ApiAppointment {
  _id: string;
  status:
    | "scheduled"
    | "confirmed"
    | "checked_in"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "no_show";
  appointmentType: "scheduled" | "follow_up" | "walk_in" | "emergency";
}

type BedOccupancy = {
  vacant: number;
  occupied: number;
  cleaning: number;
  maintenance: number;
  total?: number;
};

const EMPTY_OCCUPANCY: BedOccupancy = { vacant: 0, occupied: 0, cleaning: 0, maintenance: 0, total: 0 };

/** Pulls an ObjectId string out of a field that may or may not be populated. */
function idOf(ref: Ref<{ _id: string }> | undefined): string | undefined {
  if (!ref) return undefined;
  return typeof ref === "string" ? ref : ref._id;
}

export default function ReceptionDashboard() {
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  // Queue entries bucketed by doctor. Why doctor and not department: every
  // "queue-updated" socket event carries ONE doctor's complete current
  // snapshot (see queue.controller.ts/broadcastQueueUpdate), so the safest
  // way to keep a hospital-wide view in sync is to replace that doctor's
  // bucket wholesale whenever their event arrives.
  const [entriesByDoctor, setEntriesByDoctor] = useState<Record<string, ApiQueueEntry[]>>({});
  const [bedOccupancy, setBedOccupancy] = useState<BedOccupancy>(EMPTY_OCCUPANCY);
  const [todayAppointments, setTodayAppointments] = useState<ApiAppointment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // -------------------------------------------------------------------------
  // Fetchers. Beds/appointments failures are non-fatal — a stale widget beats
  // a crashed dashboard. The department+queue bootstrap is the one failure we
  // surface, since without it the whole page would silently show zeros.
  // -------------------------------------------------------------------------

  const fetchBedOccupancy = useCallback(async () => {
    try {
      const res = await apiClient.get<{ data: { occupancy: BedOccupancy } }>("/beds", {
        params: { limit: 1 }, // we only need the aggregate `occupancy`, not the bed list
      });
      setBedOccupancy(res.data.data.occupancy);
    } catch {
      // keep last known occupancy rather than zeroing the widget out
    }
  }, []);

  const fetchTodayAppointments = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await apiClient.get<{ data: { appointments: ApiAppointment[] } }>("/appointments", {
        params: { date: today, limit: 100 },
      });
      setTodayAppointments(res.data.data.appointments ?? []);
    } catch {
      // non-fatal — widget just won't refresh this cycle
    }
  }, []);

  const fetchQueues = useCallback(async (depts: ApiDepartment[]) => {
    const perDepartment = await Promise.all(
      depts.map((dept) =>
        apiClient
          .get<{ data: { entries: ApiQueueEntry[] } }>("/queue", { params: { departmentId: dept._id } })
          .then((res) => res.data.data.entries ?? [])
          .catch(() => [] as ApiQueueEntry[])
      )
    );

    const bucket: Record<string, ApiQueueEntry[]> = {};
    for (const entry of perDepartment.flat()) {
      const doctorId = idOf(entry.doctor);
      if (!doctorId) continue;
      if (!bucket[doctorId]) bucket[doctorId] = [];
      bucket[doctorId].push(entry);
    }
    setEntriesByDoctor(bucket);
  }, []);

  // -------------------------------------------------------------------------
  // Initial load
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const deptRes = await apiClient.get<{ data: { departments: ApiDepartment[] } }>("/departments", {
          params: { isActive: true, limit: 100 },
        });
        const depts = deptRes.data.data.departments ?? [];
        if (cancelled) return;
        setDepartments(depts);

        await Promise.all([fetchQueues(depts), fetchBedOccupancy(), fetchTodayAppointments()]);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchQueues, fetchBedOccupancy, fetchTodayAppointments]);

  // -------------------------------------------------------------------------
  // Real-time channels — all three active simultaneously, same as before,
  // but each one now updates real previously-fetched state instead of being
  // the *only* source of truth (which is why stat cards used to sit at 0
  // until the first event happened to fire).
  // -------------------------------------------------------------------------

  const onQueueUpdated = useCallback((payload: QueueUpdatedPayload) => {
    setEntriesByDoctor((prev) => ({
      ...prev,
      [payload.doctorId]: payload.queue as unknown as ApiQueueEntry[],
    }));
    setLastUpdated(new Date(payload.updatedAt).toLocaleTimeString());
  }, []);
  useRealtimeQueue({ onQueueUpdated, showCalledToast: true });

  // Bed occupancy in the socket payload is scoped to a single department
  // (see bed.controller.ts/emitBedUpdate), so we treat the event purely as an
  // invalidation signal and re-pull the hospital-wide aggregate rather than
  // trying to reconstruct a global total from a partial snapshot.
  const onBedStatusChanged = useCallback(
    (_payload: BedStatusChangedPayload) => {
      fetchBedOccupancy();
    },
    [fetchBedOccupancy]
  );
  useRealtimeBeds({ onBedStatusChanged, showToasts: true });

  const onNewAppointment = useCallback(
    (_payload: NewAppointmentPayload) => {
      fetchTodayAppointments();
    },
    [fetchTodayAppointments]
  );
  const onPatientStatusChanged = useCallback(
    (_payload: PatientStatusChangedPayload) => {
      fetchTodayAppointments();
    },
    [fetchTodayAppointments]
  );
  useRealtimeAppointments({ onNewAppointment, onPatientStatusChanged, showToasts: true });

  // -------------------------------------------------------------------------
  // Derived stats
  // -------------------------------------------------------------------------

  const allEntries = useMemo(() => Object.values(entriesByDoctor).flat(), [entriesByDoctor]);

  const queueStats = useMemo(
    () => ({
      waiting: allEntries.filter((e) => e.status === "waiting").length,
      called: allEntries.filter((e) => e.status === "called").length,
      inProgress: allEntries.filter((e) => e.status === "in_progress").length,
    }),
    [allEntries]
  );

  const appointmentStats = useMemo(() => {
    const counts = { total: todayAppointments.length, checkedIn: 0, completed: 0, cancelled: 0, noShow: 0 };
    for (const a of todayAppointments) {
      if (a.status === "checked_in" || a.status === "in_progress") counts.checkedIn++;
      else if (a.status === "completed") counts.completed++;
      else if (a.status === "cancelled") counts.cancelled++;
      else if (a.status === "no_show") counts.noShow++;
    }
    return counts;
  }, [todayAppointments]);

  const bedsTotal =
    bedOccupancy.total ??
    bedOccupancy.vacant + bedOccupancy.occupied + bedOccupancy.cleaning + bedOccupancy.maintenance;

  const departmentBreakdown = useMemo(
    () =>
      departments.map((dept) => {
        const deptEntries = allEntries.filter((e) => idOf(e.department) === dept._id);
        return {
          ...dept,
          waiting: deptEntries.filter((e) => e.status === "waiting").length,
          inProgress: deptEntries.filter((e) => e.status === "in_progress").length,
        };
      }),
    [departments, allEntries]
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-400">Loading dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-sm text-rose-600">⚠️ {error}</p>
      </div>
    );
  }

  const statCards = [
    { label: "Waiting", val: queueStats.waiting, color: "text-indigo-600" },
    { label: "Called", val: queueStats.called, color: "text-amber-600" },
    { label: "In Progress", val: queueStats.inProgress, color: "text-green-600" },
    { label: "Today's Appointments", val: appointmentStats.total, color: "text-slate-800" },
    { label: "Checked In", val: appointmentStats.checkedIn, color: "text-blue-600" },
    { label: "Beds Vacant", val: bedOccupancy.vacant, color: "text-emerald-600" },
    { label: "Beds Occupied", val: bedOccupancy.occupied, color: "text-rose-600" },
    { label: "Total Beds", val: bedsTotal, color: "text-slate-500" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Reception Dashboard</h1>
          <p className="text-sm text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            Live — queue, beds &amp; appointments update automatically
          </p>
        </div>
        {lastUpdated && (
          <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">↻ {lastUpdated}</span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className={`text-4xl font-black mt-1 ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-3">
        Live by department
      </h2>
      {departmentBreakdown.length === 0 ? (
        <p className="text-sm text-slate-400">No active departments configured.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Department</th>
                <th className="text-left px-5 py-3">Code</th>
                <th className="text-right px-5 py-3">Waiting</th>
                <th className="text-right px-5 py-3">In Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departmentBreakdown.map((dept) => (
                <tr key={dept._id}>
                  <td className="px-5 py-3 font-medium text-slate-700">{dept.name}</td>
                  <td className="px-5 py-3 text-slate-400">{dept.code}</td>
                  <td className="px-5 py-3 text-right text-slate-700">{dept.waiting}</td>
                  <td className="px-5 py-3 text-right text-slate-700">{dept.inProgress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}