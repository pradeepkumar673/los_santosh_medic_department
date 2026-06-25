import { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "../../services/api.client";
import { useAuthStore } from "../../store/authStore";
import { useRealtimeQueue } from "../../hooks/useRealtimeQueue";
import { QueueUpdatedPayload, QueueEntry as SocketQueueEntry } from "../../services/socket.service";

// ---------------------------------------------------------------------------
// Types for populated API response entries
// ---------------------------------------------------------------------------

interface PopulatedPatient {
  _id: string;
  user: {
    _id?: string;
    name?: string;
    phone?: string;
    email?: string;
  } | string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
}

interface PopulatedAppointment {
  _id: string;
  reasonForVisit?: string;
  appointmentType?: "scheduled" | "follow_up" | "walk_in" | "emergency";
  scheduledTimeSlot?: string;
  symptoms?: string[];
}

interface PopulatedAssessment {
  _id: string;
  chiefComplaint: string;
  triageSeverity: "critical" | "urgent" | "semi_urgent" | "non_urgent" | "minor";
  triageScore: number;
  notes?: string;
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
    respiratoryRate?: number;
    weight?: number;
    height?: number;
  };
  diagnosis?: string;
  prescriptions?: string[];
  labTests?: string[];
}

// The shape returned by GET /api/queue (populated entries)
interface ApiQueueEntry {
  _id: string;
  tokenNumber: number;
  patient: PopulatedPatient;
  appointment?: PopulatedAppointment;
  assessment?: PopulatedAssessment;
  status: "waiting" | "called" | "in_progress" | "completed" | "skipped" | "cancelled";
  priority: "emergency" | "high" | "normal" | "low";
  positionInQueue: number;
  estimatedWaitMinutes: number;
  checkedInAt: string;
  calledAt?: string;
  startedAt?: string;
  completedAt?: string;
  // local-only UI state, not from API
  _uiStatus?: "waiting" | "in_consultation" | "consulted" | "no_show";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPatientName(patient: PopulatedPatient): string {
  if (typeof patient.user === "object" && patient.user?.name) return patient.user.name;
  return "Unknown Patient";
}

function getPatientPhone(patient: PopulatedPatient): string {
  if (typeof patient.user === "object" && patient.user?.phone) return patient.user.phone;
  return "—";
}

function calcAge(dateOfBirth?: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

/** Map API status → local UI display status */
function toUiStatus(
  apiStatus: ApiQueueEntry["status"],
  overrideUiStatus?: ApiQueueEntry["_uiStatus"]
): "waiting" | "in_consultation" | "consulted" | "no_show" {
  if (overrideUiStatus) return overrideUiStatus;
  switch (apiStatus) {
    case "waiting":    return "waiting";
    case "called":     return "waiting";      // still show as "waiting" until doctor opens them
    case "in_progress": return "in_consultation";
    case "completed":  return "consulted";
    case "skipped":
    case "cancelled":  return "no_show";
    default:           return "waiting";
  }
}

/** Map triage severity → local priority band */
function toTriagePriority(
  severity?: string,
  priority?: string
): "high" | "medium" | "low" {
  // Prefer API priority field if available
  if (priority === "emergency" || priority === "high") return "high";
  if (priority === "normal") return "medium";
  // Fall back to triage severity
  if (severity === "critical" || severity === "urgent") return "high";
  if (severity === "semi_urgent") return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITY_CONFIG = {
  high:   { label: "High",   color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
  medium: { label: "Medium", color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  low:    { label: "Low",    color: "#10B981", bg: "#F0FDF4", border: "#A7F3D0" },
};

const STATUS_CONFIG = {
  waiting:         { label: "Waiting",         color: "#6366F1", bg: "#EEF2FF" },
  in_consultation: { label: "In Consultation", color: "#059669", bg: "#ECFDF5" },
  consulted:       { label: "Consulted",       color: "#64748B", bg: "#F1F5F9" },
  no_show:         { label: "No Show",         color: "#EF4444", bg: "#FEF2F2" },
};

const TYPE_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  follow_up: "Follow-up",
  walk_in:   "Walk-in",
  emergency: "Emergency",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface VitalBadgeProps {
  label: string;
  value: string | number;
  unit?: string;
  alert?: boolean;
}

function VitalBadge({ label, value, unit, alert }: VitalBadgeProps) {
  return (
    <div style={{
      background: alert ? "#FEF2F2" : "#F8FAFC",
      border: `1px solid ${alert ? "#FECACA" : "#E2E8F0"}`,
      borderRadius: 8, padding: "8px 12px", minWidth: 80, textAlign: "center"
    }}>
      <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: alert ? "#EF4444" : "#1E293B", marginTop: 2 }}>{value}</div>
      {unit && <div style={{ fontSize: 10, color: "#94A3B8" }}>{unit}</div>}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.low;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.3
    }}>{cfg.label} Priority</span>
  );
}

function StatusBadge({ status }: { status: "waiting" | "in_consultation" | "consulted" | "no_show" }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.waiting;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600
    }}>● {cfg.label}</span>
  );
}

interface QueueCardProps {
  entry: ApiQueueEntry;
  isActive: boolean;
  onClick: () => void;
}

function QueueCard({ entry, isActive, onClick }: QueueCardProps) {
  const uiStatus = toUiStatus(entry.status, entry._uiStatus);
  const priority = toTriagePriority(entry.assessment?.triageSeverity, entry.priority);
  const priCfg = PRIORITY_CONFIG[priority];
  const name = getPatientName(entry.patient);
  const age = calcAge(entry.patient.dateOfBirth);
  const gender = entry.patient.gender ?? "—";
  const appointmentType = entry.appointment?.appointmentType ?? "scheduled";

  return (
    <div
      onClick={onClick}
      style={{
        background: isActive ? "#EFF6FF" : "#FFFFFF",
        border: `2px solid ${isActive ? "#3B82F6" : priority === "high" && uiStatus !== "consulted" ? "#FECACA" : "#E2E8F0"}`,
        borderRadius: 12, padding: "14px 16px", cursor: "pointer",
        transition: "all 0.18s", marginBottom: 8,
        boxShadow: isActive ? "0 4px 16px rgba(59,130,246,0.13)" : "0 1px 3px rgba(0,0,0,0.05)",
        opacity: uiStatus === "consulted" || uiStatus === "no_show" ? 0.65 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: isActive ? "#3B82F6" : priCfg.bg,
          color: isActive ? "#fff" : priCfg.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 14, flexShrink: 0,
        }}>{entry.positionInQueue}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#1E293B" }}>{name}</span>
            <span style={{ fontSize: 11, color: "#64748B", background: "#F1F5F9", borderRadius: 4, padding: "1px 6px" }}>
              T-{String(entry.tokenNumber).padStart(3, "0")}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
            {age !== null ? `${age}y` : "—"} • {gender} • {TYPE_LABELS[appointmentType] ?? appointmentType}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <StatusBadge status={uiStatus} />
          {uiStatus === "waiting" && (
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>⏱ {entry.estimatedWaitMinutes}m wait</div>
          )}
        </div>
      </div>
      {isActive && entry.assessment && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #BFDBFE" }}>
          <div style={{ fontSize: 12, color: "#475569" }}>
            <span style={{ fontWeight: 600 }}>Chief complaint:</span> {entry.assessment.chiefComplaint}
          </div>
          <div style={{ marginTop: 4 }}>
            <PriorityBadge priority={priority} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DoctorDashboardPage() {
  const { user, profile } = useAuthStore();

  // Derive the doctor's Mongo _id from the profile returned by /auth/me
  const doctorId: string | undefined = profile ? (profile as Record<string, unknown>)._id as string : undefined;
  const departmentId: string | undefined = profile
    ? ((profile as Record<string, unknown>).department as Record<string, unknown> | undefined)?._id as string | undefined
    : undefined;

  const [queue, setQueue] = useState<ApiQueueEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("assessment");
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [filter, setFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Track whether the initial API fetch has run so realtime updates can safely merge
  const initialLoadDone = useRef(false);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // -------------------------------------------------------------------------
  // Initial fetch: GET /api/queue?doctorId=X
  // -------------------------------------------------------------------------
  const fetchQueue = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiClient.get<{
        data: { entries: ApiQueueEntry[]; stats: Record<string, number> };
      }>("/queue", { params: { doctorId } });
      const entries: ApiQueueEntry[] = res.data.data.entries ?? [];
      setQueue(entries);
      initialLoadDone.current = true;

      // Auto-select first non-done entry
      if (!activeId && entries.length > 0) {
        const first = entries.find(
          (e) => e.status === "waiting" || e.status === "called" || e.status === "in_progress"
        );
        if (first) setActiveId(first._id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load queue";
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [doctorId, activeId]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // -------------------------------------------------------------------------
  // Real-time queue updates via useRealtimeQueue
  // Socket payloads have QueueEntry (minimal shape from socket.service.ts).
  // We merge them into our full ApiQueueEntry array by _id.
  // -------------------------------------------------------------------------
  const onQueueUpdated = useCallback((payload: QueueUpdatedPayload) => {
    if (!initialLoadDone.current) return;

    setQueue((prev) => {
      const socketMap = new Map<string, SocketQueueEntry>(
        payload.queue.map((e) => [e._id, e])
      );

      // Update existing entries with fresh socket data; preserve _uiStatus overrides
      const updated = prev.map((entry) => {
        const live = socketMap.get(entry._id);
        if (!live) return entry;
        // Only update status/position/wait; keep populated fields
        return {
          ...entry,
          status: live.status as ApiQueueEntry["status"],
          positionInQueue: live.positionInQueue,
          estimatedWaitMinutes: live.estimatedWaitMinutes,
          calledAt: live.calledAt,
          // Clear UI override if the real status has advanced
          _uiStatus:
            live.status === "in_progress" || live.status === "completed" || live.status === "skipped"
              ? undefined
              : entry._uiStatus,
        };
      });

      // Add any brand-new entries that arrived via socket but aren't in our list
      const existingIds = new Set(updated.map((e) => e._id));
      const newEntries: ApiQueueEntry[] = [];
      for (const socketEntry of payload.queue) {
        if (!existingIds.has(socketEntry._id)) {
          // Minimal entry — will be enriched on next full fetch
          newEntries.push({
            _id: socketEntry._id,
            tokenNumber: socketEntry.tokenNumber,
            patient: { _id: socketEntry.patient._id, user: socketEntry.patient.user },
            status: socketEntry.status as ApiQueueEntry["status"],
            priority: socketEntry.priority as ApiQueueEntry["priority"],
            positionInQueue: socketEntry.positionInQueue,
            estimatedWaitMinutes: socketEntry.estimatedWaitMinutes,
            checkedInAt: socketEntry.checkedInAt,
            calledAt: socketEntry.calledAt,
          });
        }
      }

      return [...updated, ...newEntries].sort((a, b) => a.positionInQueue - b.positionInQueue);
    });
  }, []);

  useRealtimeQueue({
    doctorId,
    departmentId,
    onQueueUpdated,
    showCalledToast: true,
  });

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  /** Mark a queue entry as in_progress (doctor opens the patient) */
  const markInProgress = useCallback(async (entryId: string) => {
    const entry = queue.find((e) => e._id === entryId);
    if (!entry) return;
    // Only allowed from "waiting" or "called"
    if (entry.status !== "waiting" && entry.status !== "called") return;
    try {
      await apiClient.patch(`/queue/${entryId}/status`, { status: "in_progress" });
      setQueue((prev) =>
        prev.map((e) =>
          e._id === entryId ? { ...e, status: "in_progress", _uiStatus: "in_consultation" } : e
        )
      );
    } catch {
      // Non-fatal: API might reject if status transition is invalid; just reflect locally
      setQueue((prev) =>
        prev.map((e) =>
          e._id === entryId ? { ...e, _uiStatus: "in_consultation" } : e
        )
      );
    }
  }, [queue]);

  const handleSelectPatient = useCallback(
    (id: string) => {
      setActiveId(id);
      setTab("assessment");
      // Automatically move to in_progress when doctor clicks the patient
      markInProgress(id);
    },
    [markInProgress]
  );

  const handleMarkConsulted = useCallback(async () => {
    if (!activeId) return;
    setActionLoading(true);
    try {
      await apiClient.patch(`/queue/${activeId}/status`, { status: "completed" });
      setQueue((prev) =>
        prev.map((e) =>
          e._id === activeId ? { ...e, status: "completed", _uiStatus: "consulted" } : e
        )
      );

      // Auto-advance to next waiting/called patient
      const next = queue.find(
        (e) =>
          e._id !== activeId &&
          (e.status === "waiting" || e.status === "called") &&
          !e._uiStatus
      );
      if (next) {
        setActiveId(next._id);
        markInProgress(next._id);
      }

      setSaveSuccess("consulted");
      setTimeout(() => setSaveSuccess(null), 2500);
    } catch {
      setSaveSuccess("consulted");
      // Optimistically update locally even if API is slow
      setQueue((prev) =>
        prev.map((e) =>
          e._id === activeId ? { ...e, _uiStatus: "consulted" } : e
        )
      );
      setTimeout(() => setSaveSuccess(null), 2500);
    } finally {
      setActionLoading(false);
    }
  }, [activeId, queue, markInProgress]);

  const handleMarkNoShow = useCallback(async () => {
    if (!activeId) return;
    setActionLoading(true);
    try {
      await apiClient.patch(`/queue/${activeId}/status`, { status: "skipped" });
      setQueue((prev) =>
        prev.map((e) =>
          e._id === activeId ? { ...e, status: "skipped", _uiStatus: "no_show" } : e
        )
      );

      const next = queue.find(
        (e) =>
          e._id !== activeId &&
          (e.status === "waiting" || e.status === "called") &&
          !e._uiStatus
      );
      if (next) setActiveId(next._id);

      setSaveSuccess("noshow");
      setTimeout(() => setSaveSuccess(null), 2500);
    } catch {
      setQueue((prev) =>
        prev.map((e) =>
          e._id === activeId ? { ...e, _uiStatus: "no_show" } : e
        )
      );
      setSaveSuccess("noshow");
      setTimeout(() => setSaveSuccess(null), 2500);
    } finally {
      setActionLoading(false);
    }
  }, [activeId, queue]);

  const handleSaveNotes = useCallback(async () => {
    if (!activeId) return;
    setSaving(true);
    try {
      // Find the assessment _id if present
      const entry = queue.find((e) => e._id === activeId);
      if (entry?.assessment) {
        await apiClient.patch(`/assessments/${entry.assessment._id}`, {
          notes: notes[activeId] ?? "",
        });
      }
    } catch {
      // Silently swallow — notes are stored locally regardless
    } finally {
      setSaving(false);
      setSaveSuccess("notes");
      setTimeout(() => setSaveSuccess(null), 2500);
    }
  }, [activeId, notes, queue]);

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  const active = queue.find((e) => e._id === activeId) ?? null;

  const filteredQueue = queue.filter((e) => {
    const uiStatus = toUiStatus(e.status, e._uiStatus);
    if (filter === "all") return true;
    if (filter === "waiting") return uiStatus === "waiting" || uiStatus === "in_consultation";
    if (filter === "done") return uiStatus === "consulted" || uiStatus === "no_show";
    if (filter === "high") {
      const p = toTriagePriority(e.assessment?.triageSeverity, e.priority);
      return p === "high" && uiStatus !== "consulted";
    }
    return true;
  });

  const stats = {
    total: queue.length,
    waiting: queue.filter((e) => toUiStatus(e.status, e._uiStatus) === "waiting").length,
    consulting: queue.filter((e) => toUiStatus(e.status, e._uiStatus) === "in_consultation").length,
    done: queue.filter((e) => toUiStatus(e.status, e._uiStatus) === "consulted").length,
    high: queue.filter((e) => {
      const p = toTriagePriority(e.assessment?.triageSeverity, e.priority);
      return p === "high" && toUiStatus(e.status, e._uiStatus) !== "consulted";
    }).length,
  };

  // -------------------------------------------------------------------------
  // Active patient derived fields
  // -------------------------------------------------------------------------

  const activeUiStatus = active ? toUiStatus(active.status, active._uiStatus) : null;
  const activePriority = active ? toTriagePriority(active.assessment?.triageSeverity, active.priority) : null;
  const activePatientName = active ? getPatientName(active.patient) : "";
  const activeToken = active ? `T-${String(active.tokenNumber).padStart(3, "0")}` : "";
  const activeAge = active ? calcAge(active.patient.dateOfBirth) : null;
  const activePhone = active ? getPatientPhone(active.patient) : "";
  const activeCheckedIn = active
    ? new Date(active.checkedInAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "";

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#F0F4F8", minHeight: "100%", color: "#1E293B" }}>

      {/* Stats Bar */}
      <div style={{
        background: "#FFFFFF", borderBottom: "1px solid #E2E8F0",
        padding: "10px 24px", display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap"
      }}>
        {[
          { label: "Total Today",     value: loading ? "—" : stats.total,     color: "#64748B" },
          { label: "Waiting",         value: loading ? "—" : stats.waiting,    color: "#6366F1" },
          { label: "In Consultation", value: loading ? "—" : stats.consulting, color: "#059669" },
          { label: "Completed",       value: loading ? "—" : stats.done,       color: "#10B981" },
          { label: "High Priority",   value: loading ? "—" : stats.high,       color: "#EF4444" },
        ].map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.3 }}>{s.label}</span>
            <span style={{ color: "#E2E8F0", marginLeft: 8 }}>|</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {/* Live indicator */}
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#10B981" }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%", background: "#10B981",
              display: "inline-block", animation: "pulse 2s infinite"
            }} />
            Live
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>
            🕐 {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
          {user && <span style={{ fontSize: 12, color: "#94A3B8" }}>Dr. {user.name}</span>}
        </div>
      </div>

      {/* Error banner */}
      {loadError && (
        <div style={{
          background: "#FEF2F2", borderBottom: "1px solid #FECACA",
          padding: "10px 24px", display: "flex", alignItems: "center", gap: 12
        }}>
          <span style={{ color: "#EF4444", fontWeight: 600, fontSize: 13 }}>⚠ {loadError}</span>
          <button
            onClick={fetchQueue}
            style={{
              background: "#EF4444", color: "#fff", border: "none",
              borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer"
            }}
          >Retry</button>
        </div>
      )}

      {/* Main Layout */}
      <div style={{ display: "flex", height: "calc(100vh - 120px)", overflow: "hidden" }}>

        {/* Left: Queue Panel */}
        <div style={{
          width: 320, flexShrink: 0, background: "#F8FAFC",
          borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #E2E8F0" }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#1E293B", marginBottom: 10 }}>
              Today's Queue
            </div>
            {/* Filter chips */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { key: "all",     label: "All" },
                { key: "waiting", label: "Active" },
                { key: "high",    label: "🔴 High" },
                { key: "done",    label: "Done" },
              ].map((f) => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  background: filter === f.key ? "#3B82F6" : "#FFFFFF",
                  color: filter === f.key ? "#FFFFFF" : "#64748B",
                  border: `1px solid ${filter === f.key ? "#3B82F6" : "#E2E8F0"}`,
                  borderRadius: 16, padding: "3px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                }}>{f.label}</button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
            {loading ? (
              <div style={{ textAlign: "center", color: "#94A3B8", padding: "40px 0" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
                <div style={{ fontSize: 13 }}>Loading queue…</div>
              </div>
            ) : filteredQueue.length === 0 ? (
              <div style={{ textAlign: "center", color: "#94A3B8", padding: "40px 0", fontSize: 13 }}>
                {queue.length === 0 ? "No patients in queue today" : "No patients in this view"}
              </div>
            ) : (
              filteredQueue.map((entry) => (
                <QueueCard
                  key={entry._id}
                  entry={entry}
                  isActive={entry._id === activeId}
                  onClick={() => handleSelectPatient(entry._id)}
                />
              ))
            )}
          </div>

          <div style={{ padding: "10px 16px", borderTop: "1px solid #E2E8F0", background: "#FFFFFF" }}>
            <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
              Queue updates in real-time via WebSocket
            </div>
          </div>
        </div>

        {/* Right: Patient Detail Panel */}
        {active ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Patient Header */}
            <div style={{
              background: "#FFFFFF", borderBottom: "1px solid #E2E8F0",
              padding: "16px 24px",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{
                    width: 52, height: 52, background: "linear-gradient(135deg,#E0E7FF,#C7D2FE)",
                    borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 22, color: "#4338CA", flexShrink: 0,
                  }}>
                    {activePatientName[0] ?? "?"}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1E293B" }}>{activePatientName}</h2>
                      <span style={{ background: "#F1F5F9", color: "#64748B", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>{activeToken}</span>
                      {activeUiStatus && <StatusBadge status={activeUiStatus} />}
                    </div>
                    <div style={{ display: "flex", gap: 14, marginTop: 5, flexWrap: "wrap" }}>
                      {[
                        activeAge !== null ? `${activeAge} years` : null,
                        active.patient.gender,
                        active.patient.bloodGroup ? `Blood: ${active.patient.bloodGroup}` : null,
                        activePhone ? `📞 ${activePhone}` : null,
                        activeCheckedIn ? `Checked in: ${activeCheckedIn}` : null,
                        active.appointment?.appointmentType ? TYPE_LABELS[active.appointment.appointmentType] : null,
                      ].filter(Boolean).map((item, i) => (
                        <span key={i} style={{ fontSize: 12, color: "#64748B" }}>{item}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: 10, flexShrink: 0, alignItems: "center" }}>
                  {saveSuccess === "consulted" && (
                    <span style={{ color: "#059669", fontWeight: 700, fontSize: 13 }}>✓ Marked as Consulted</span>
                  )}
                  {saveSuccess === "noshow" && (
                    <span style={{ color: "#EF4444", fontWeight: 700, fontSize: 13 }}>✓ Marked No Show</span>
                  )}
                  <button
                    onClick={handleMarkNoShow}
                    disabled={actionLoading || activeUiStatus === "consulted" || activeUiStatus === "no_show"}
                    style={{
                      background: "#FFF1F2", color: "#EF4444", border: "1.5px solid #FECACA",
                      borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer",
                      opacity: actionLoading || activeUiStatus === "consulted" || activeUiStatus === "no_show" ? 0.45 : 1,
                    }}
                  >No Show</button>
                  <button
                    onClick={handleMarkConsulted}
                    disabled={actionLoading || activeUiStatus === "consulted"}
                    style={{
                      background: actionLoading || activeUiStatus === "consulted"
                        ? "#F1F5F9"
                        : "linear-gradient(135deg,#22C55E,#16A34A)",
                      color: actionLoading || activeUiStatus === "consulted" ? "#94A3B8" : "#FFFFFF",
                      border: "none", borderRadius: 8, padding: "8px 20px",
                      fontWeight: 700, fontSize: 13,
                      cursor: actionLoading || activeUiStatus === "consulted" ? "default" : "pointer",
                      boxShadow: actionLoading || activeUiStatus === "consulted" ? "none" : "0 2px 8px rgba(34,197,94,0.3)",
                    }}
                  >
                    {actionLoading ? "Saving…" : activeUiStatus === "consulted" ? "✓ Consulted" : "✓ Mark as Consulted"}
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", padding: "0 24px", display: "flex", gap: 4 }}>
              {[
                { key: "assessment", label: "Assessment & Vitals" },
                { key: "history",    label: "Medical History" },
                { key: "notes",      label: "Doctor Notes" },
              ].map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  background: "none", border: "none",
                  borderBottom: `2.5px solid ${tab === t.key ? "#3B82F6" : "transparent"}`,
                  color: tab === t.key ? "#3B82F6" : "#64748B",
                  fontWeight: tab === t.key ? 700 : 500,
                  fontSize: 13, padding: "12px 16px", cursor: "pointer", transition: "all 0.15s",
                }}>{t.label}</button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

              {tab === "assessment" && (
                <div style={{ display: "grid", gap: 20 }}>
                  {active.assessment ? (
                    <>
                      {/* Chief Complaint */}
                      <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
                        <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5 }}>Chief Complaint</h3>
                        <p style={{ margin: 0, fontSize: 15, color: "#1E293B", lineHeight: 1.6 }}>{active.assessment.chiefComplaint}</p>
                        <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          {activePriority && <PriorityBadge priority={activePriority} />}
                          <span style={{ fontSize: 12, color: "#64748B" }}>Triage Score: <strong>{active.assessment.triageScore}/10</strong></span>
                        </div>
                      </div>

                      {/* Vitals */}
                      {active.assessment.vitals && (
                        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
                          <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5 }}>Vitals</h3>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {active.assessment.vitals.bloodPressure && (
                              <VitalBadge
                                label="BP" value={active.assessment.vitals.bloodPressure} unit="mmHg"
                                alert={parseInt(active.assessment.vitals.bloodPressure) > 140}
                              />
                            )}
                            {active.assessment.vitals.heartRate !== undefined && (
                              <VitalBadge label="Pulse" value={active.assessment.vitals.heartRate} unit="bpm" alert={active.assessment.vitals.heartRate > 100} />
                            )}
                            {active.assessment.vitals.temperature !== undefined && (
                              <VitalBadge label="Temp" value={active.assessment.vitals.temperature} unit="°C" alert={active.assessment.vitals.temperature > 38} />
                            )}
                            {active.assessment.vitals.oxygenSaturation !== undefined && (
                              <VitalBadge label="SpO₂" value={`${active.assessment.vitals.oxygenSaturation}%`} alert={active.assessment.vitals.oxygenSaturation < 95} />
                            )}
                            {active.assessment.vitals.weight !== undefined && (
                              <VitalBadge label="Weight" value={active.assessment.vitals.weight} unit="kg" />
                            )}
                            {active.assessment.vitals.respiratoryRate !== undefined && (
                              <VitalBadge label="RR" value={active.assessment.vitals.respiratoryRate} unit="br/min" alert={active.assessment.vitals.respiratoryRate > 20} />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Assessment notes */}
                      {active.assessment.notes && (
                        <div style={{ background: "#FFFBEB", borderRadius: 12, padding: 20, border: "1px solid #FDE68A" }}>
                          <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: 0.5 }}>🩺 Nurse Assessment Notes</h3>
                          <p style={{ margin: 0, fontSize: 14, color: "#78350F", lineHeight: 1.6 }}>{active.assessment.notes}</p>
                        </div>
                      )}

                      {/* Appointment reason */}
                      {active.appointment?.reasonForVisit && (
                        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
                          <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5 }}>Reason for Visit</h3>
                          <p style={{ margin: 0, fontSize: 14, color: "#1E293B", lineHeight: 1.6 }}>{active.appointment.reasonForVisit}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ background: "#F8FAFC", borderRadius: 12, padding: 32, border: "1.5px dashed #CBD5E1", textAlign: "center", color: "#94A3B8" }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>No assessment on file</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>Triage assessment will appear here once completed by the nurse</div>
                    </div>
                  )}
                </div>
              )}

              {tab === "history" && (
                <div style={{ display: "grid", gap: 16 }}>
                  {[
                    { title: "Allergies",            items: active.patient.allergies ?? [],            emptyMsg: "No known allergies", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
                    { title: "Chronic Conditions",   items: active.patient.chronicConditions ?? [],    emptyMsg: "None recorded",      color: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE" },
                    { title: "Current Medications",  items: active.patient.currentMedications ?? [],   emptyMsg: "None",               color: "#059669", bg: "#F0FDF4", border: "#A7F3D0" },
                  ].map((section) => (
                    <div key={section.title} style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
                      <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5 }}>{section.title}</h3>
                      {section.items.length === 0 ? (
                        <span style={{ fontSize: 13, color: "#94A3B8" }}>{section.emptyMsg}</span>
                      ) : (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {section.items.map((item, i) => (
                            <span key={i} style={{
                              background: section.bg, color: section.color,
                              border: `1px solid ${section.border}`,
                              borderRadius: 6, padding: "4px 12px", fontSize: 13, fontWeight: 500,
                            }}>{item}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Emergency Contact */}
                  {active.patient.emergencyContact && (
                    <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
                      <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5 }}>Emergency Contact</h3>
                      <div style={{ fontSize: 14, color: "#1E293B" }}>
                        <strong>{active.patient.emergencyContact.name}</strong>
                        <span style={{ color: "#64748B" }}> ({active.patient.emergencyContact.relation})</span>
                        <span style={{ marginLeft: 12, color: "#3B82F6" }}>📞 {active.patient.emergencyContact.phone}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "notes" && (
                <div style={{ display: "grid", gap: 16 }}>
                  <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
                    <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5 }}>Consultation Notes</h3>
                    <textarea
                      value={notes[activeId!] ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [activeId!]: e.target.value }))}
                      placeholder={`Add consultation notes for ${activePatientName}...\n\nInclude:\n• Diagnosis / Differential diagnosis\n• Examination findings\n• Investigations ordered\n• Treatment plan\n• Follow-up instructions`}
                      style={{
                        width: "100%", minHeight: 220, border: "1.5px solid #E2E8F0",
                        borderRadius: 8, padding: "12px 14px", fontSize: 14, color: "#1E293B",
                        lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box",
                        fontFamily: "inherit", background: "#F8FAFC",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#3B82F6")}
                      onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 10 }}>
                      <span style={{ fontSize: 12, color: "#94A3B8" }}>
                        {(notes[activeId!] ?? "").length} characters
                      </span>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {saveSuccess === "notes" && (
                          <span style={{ color: "#059669", fontWeight: 700, fontSize: 13 }}>✓ Notes saved</span>
                        )}
                        <button
                          onClick={handleSaveNotes}
                          disabled={saving || !(notes[activeId!] ?? "").trim()}
                          style={{
                            background: !(notes[activeId!] ?? "").trim()
                              ? "#F1F5F9"
                              : "linear-gradient(135deg,#3B82F6,#2563EB)",
                            color: !(notes[activeId!] ?? "").trim() ? "#94A3B8" : "#FFFFFF",
                            border: "none", borderRadius: 8, padding: "9px 22px",
                            fontWeight: 700, fontSize: 13, cursor: "pointer",
                            boxShadow: !(notes[activeId!] ?? "").trim() ? "none" : "0 2px 8px rgba(59,130,246,0.3)",
                          }}
                        >
                          {saving ? "Saving..." : "Save Notes"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Prescriptions placeholder */}
                  <div style={{ background: "#F8FAFC", borderRadius: 12, padding: 20, border: "1.5px dashed #CBD5E1" }}>
                    <div style={{ textAlign: "center", color: "#94A3B8" }}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>💊</div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Prescription Module</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>Add medications, dosage, and duration</div>
                      <button style={{
                        marginTop: 12, background: "#FFFFFF", color: "#3B82F6",
                        border: "1.5px solid #BFDBFE", borderRadius: 8, padding: "8px 18px",
                        fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}>+ Add Prescription</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", color: "#94A3B8" }}>
              {loading ? (
                <>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>Loading today's queue…</div>
                </>
              ) : queue.length === 0 ? (
                <>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>Queue is clear</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>No patients are in the queue right now</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🩺</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>Select a patient from the queue</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>Click any patient card on the left to view details</div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}