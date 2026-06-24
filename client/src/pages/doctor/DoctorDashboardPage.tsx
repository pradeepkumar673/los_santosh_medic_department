import { useState, useEffect, useCallback } from "react";

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  bloodGroup: string;
  phone: string;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
}

interface Vitals {
  bp: string;
  pulse: number;
  temp: number;
  spo2: number;
  weight: number;
}

interface Assessment {
  chiefComplaint: string;
  vitals: Vitals;
  triagePriority: "high" | "medium" | "low";
  triageScore: number;
  notes: string;
}

interface QueueEntry {
  id: string;
  token: string;
  position: number;
  patient: Patient;
  assessment: Assessment;
  appointmentType: "scheduled" | "follow_up" | "walk_in" | "emergency";
  waitTime: number;
  status: "waiting" | "in_consultation" | "consulted" | "no_show";
  checkedInAt: string;
}

const MOCK_QUEUE: QueueEntry[] = [
  {
    id: "q1", token: "T-001", position: 1,
    patient: {
      id: "p1", name: "Arjun Mehta", age: 34, gender: "male",
      bloodGroup: "B+", phone: "9876543210",
      allergies: ["Penicillin"], chronicConditions: ["Hypertension"],
      currentMedications: ["Amlodipine 5mg"],
      emergencyContact: { name: "Priya Mehta", relation: "Wife", phone: "9876543211" },
    },
    assessment: {
      chiefComplaint: "Chest tightness and shortness of breath since morning",
      vitals: { bp: "145/92", pulse: 88, temp: 98.6, spo2: 97, weight: 72 },
      triagePriority: "high", triageScore: 7,
      notes: "Patient reports stress-related episodes in the past week.",
    },
    appointmentType: "scheduled", waitTime: 0, status: "in_consultation",
    checkedInAt: "09:05 AM",
  },
  {
    id: "q2", token: "T-002", position: 2,
    patient: {
      id: "p2", name: "Sunita Rao", age: 52, gender: "female",
      bloodGroup: "O+", phone: "9845012345",
      allergies: [], chronicConditions: ["Type 2 Diabetes", "Hypothyroidism"],
      currentMedications: ["Metformin 500mg", "Levothyroxine 50mcg"],
      emergencyContact: { name: "Ramesh Rao", relation: "Husband", phone: "9845012346" },
    },
    assessment: {
      chiefComplaint: "Routine follow-up for diabetes management",
      vitals: { bp: "130/85", pulse: 74, temp: 98.2, spo2: 99, weight: 68 },
      triagePriority: "medium", triageScore: 4,
      notes: "HbA1c test results pending. Last visit 3 months ago.",
    },
    appointmentType: "follow_up", waitTime: 18, status: "waiting",
    checkedInAt: "09:12 AM",
  },
  {
    id: "q3", token: "T-003", position: 3,
    patient: {
      id: "p3", name: "Kiran Balasubramaniam", age: 28, gender: "male",
      bloodGroup: "A-", phone: "9900112233",
      allergies: ["Sulfa drugs"], chronicConditions: [],
      currentMedications: [],
      emergencyContact: { name: "Lakshmi B", relation: "Mother", phone: "9900112234" },
    },
    assessment: {
      chiefComplaint: "Severe headache and fever for 2 days",
      vitals: { bp: "118/76", pulse: 96, temp: 101.4, spo2: 98, weight: 65 },
      triagePriority: "high", triageScore: 6,
      notes: "No recent travel. No rash. Photophobia reported.",
    },
    appointmentType: "walk_in", waitTime: 35, status: "waiting",
    checkedInAt: "09:28 AM",
  },
  {
    id: "q4", token: "T-004", position: 4,
    patient: {
      id: "p4", name: "Meena Pillai", age: 67, gender: "female",
      bloodGroup: "AB+", phone: "9712345678",
      allergies: ["Aspirin"], chronicConditions: ["Osteoarthritis", "Hypertension"],
      currentMedications: ["Losartan 50mg", "Calcium supplements"],
      emergencyContact: { name: "Suresh Pillai", relation: "Son", phone: "9712345679" },
    },
    assessment: {
      chiefComplaint: "Knee pain and swelling, difficulty walking",
      vitals: { bp: "138/88", pulse: 70, temp: 98.8, spo2: 96, weight: 74 },
      triagePriority: "medium", triageScore: 3,
      notes: "Previously on Diclofenac — stopped due to gastric issues.",
    },
    appointmentType: "scheduled", waitTime: 52, status: "waiting",
    checkedInAt: "09:40 AM",
  },
  {
    id: "q5", token: "T-005", position: 5,
    patient: {
      id: "p5", name: "Rohit Sharma", age: 19, gender: "male",
      bloodGroup: "O-", phone: "8800223344",
      allergies: [], chronicConditions: [],
      currentMedications: [],
      emergencyContact: { name: "Anita Sharma", relation: "Mother", phone: "8800223345" },
    },
    assessment: {
      chiefComplaint: "Throat pain and difficulty swallowing",
      vitals: { bp: "110/70", pulse: 80, temp: 99.8, spo2: 99, weight: 58 },
      triagePriority: "low", triageScore: 2,
      notes: "Possible tonsillitis. No history of recurrence.",
    },
    appointmentType: "walk_in", waitTime: 68, status: "waiting",
    checkedInAt: "09:55 AM",
  },
];

const PRIORITY_CONFIG = {
  high: { label: "High", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
  medium: { label: "Medium", color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  low: { label: "Low", color: "#10B981", bg: "#F0FDF4", border: "#A7F3D0" },
};

const STATUS_CONFIG = {
  waiting: { label: "Waiting", color: "#6366F1", bg: "#EEF2FF" },
  in_consultation: { label: "In Consultation", color: "#059669", bg: "#ECFDF5" },
  consulted: { label: "Consulted", color: "#64748B", bg: "#F1F5F9" },
  no_show: { label: "No Show", color: "#EF4444", bg: "#FEF2F2" },
};

const TYPE_LABELS = {
  scheduled: "Scheduled", follow_up: "Follow-up",
  walk_in: "Walk-in", emergency: "Emergency",
};

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

interface PriorityBadgeProps {
  priority: "high" | "medium" | "low";
}

function PriorityBadge({ priority }: PriorityBadgeProps) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.low;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.3
    }}>{cfg.label} Priority</span>
  );
}

interface StatusBadgeProps {
  status: "waiting" | "in_consultation" | "consulted" | "no_show";
}

function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.waiting;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600
    }}>● {cfg.label}</span>
  );
}

interface QueueCardProps {
  entry: QueueEntry;
  isActive: boolean;
  onClick: () => void;
}

function QueueCard({ entry, isActive, onClick }: QueueCardProps) {
  const { patient, assessment, token, position, waitTime, status } = entry;
  const priCfg = PRIORITY_CONFIG[assessment.triagePriority];
  return (
    <div
      onClick={onClick}
      style={{
        background: isActive ? "#EFF6FF" : "#FFFFFF",
        border: `2px solid ${isActive ? "#3B82F6" : assessment.triagePriority === "high" && status !== "consulted" ? "#FECACA" : "#E2E8F0"}`,
        borderRadius: 12, padding: "14px 16px", cursor: "pointer",
        transition: "all 0.18s", marginBottom: 8,
        boxShadow: isActive ? "0 4px 16px rgba(59,130,246,0.13)" : "0 1px 3px rgba(0,0,0,0.05)",
        opacity: status === "consulted" || status === "no_show" ? 0.65 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: isActive ? "#3B82F6" : priCfg.bg,
          color: isActive ? "#fff" : priCfg.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 14, flexShrink: 0,
        }}>{position}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#1E293B" }}>{patient.name}</span>
            <span style={{ fontSize: 11, color: "#64748B", background: "#F1F5F9", borderRadius: 4, padding: "1px 6px" }}>{token}</span>
          </div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
            {patient.age}y • {patient.gender} • {TYPE_LABELS[entry.appointmentType]}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <StatusBadge status={status} />
          {status === "waiting" && (
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>⏱ {waitTime}m wait</div>
          )}
        </div>
      </div>
      {isActive && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #BFDBFE" }}>
          <div style={{ fontSize: 12, color: "#475569" }}>
            <span style={{ fontWeight: 600 }}>Chief complaint:</span> {assessment.chiefComplaint}
          </div>
          <div style={{ marginTop: 4 }}>
            <PriorityBadge priority={assessment.triagePriority} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function DoctorDashboardPage() {
  const [queue, setQueue] = useState<QueueEntry[]>(MOCK_QUEUE);
  const [activeId, setActiveId] = useState<string>("q1");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("assessment");
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [, setConsultedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const active = queue.find(e => e.id === activeId);

  const filteredQueue = queue.filter(e => {
    if (filter === "all") return true;
    if (filter === "waiting") return e.status === "waiting" || e.status === "in_consultation";
    if (filter === "done") return e.status === "consulted" || e.status === "no_show";
    if (filter === "high") return e.assessment.triagePriority === "high";
    return true;
  });

  const handleMarkConsulted = useCallback(() => {
    setQueue(prev => prev.map(e =>
      e.id === activeId ? { ...e, status: "consulted" } : e
    ));
    setConsultedIds(prev => [...prev, activeId]);
    const next = queue.find(e => e.id !== activeId && (e.status === "waiting" || e.status === "in_consultation"));
    if (next) {
      setActiveId(next.id);
      setQueue(prev => prev.map(e => e.id === next.id ? { ...e, status: "in_consultation" } : e));
    }
    setSaveSuccess("consulted");
    setTimeout(() => setSaveSuccess(null), 2500);
  }, [activeId, queue]);

  const handleMarkNoShow = useCallback(() => {
    setQueue(prev => prev.map(e =>
      e.id === activeId ? { ...e, status: "no_show" } : e
    ));
    const next = queue.find(e => e.id !== activeId && (e.status === "waiting" || e.status === "in_consultation"));
    if (next) setActiveId(next.id);
    setSaveSuccess("noshow");
    setTimeout(() => setSaveSuccess(null), 2500);
  }, [activeId, queue]);

  const handleSaveNotes = useCallback(async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    setSaveSuccess("notes");
    setTimeout(() => setSaveSuccess(null), 2500);
  }, []);

  const handleSelectPatient = (id: string) => {
    setActiveId(id);
    setTab("assessment");
    setQueue(prev => prev.map(e =>
      e.id === id && e.status === "waiting" ? { ...e, status: "in_consultation" } : e
    ));
  };

  const stats = {
    total: queue.length,
    waiting: queue.filter(e => e.status === "waiting").length,
    consulting: queue.filter(e => e.status === "in_consultation").length,
    done: queue.filter(e => e.status === "consulted").length,
    high: queue.filter(e => e.assessment.triagePriority === "high" && e.status !== "consulted").length,
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#F0F4F8", minHeight: "100%", color: "#1E293B" }}>
      {/* Stats Bar */}
      <div style={{
        background: "#FFFFFF", borderBottom: "1px solid #E2E8F0",
        padding: "10px 24px", display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap"
      }}>
        {[
          { label: "Total Today", value: stats.total, color: "#64748B" },
          { label: "Waiting", value: stats.waiting, color: "#6366F1" },
          { label: "In Consultation", value: stats.consulting, color: "#059669" },
          { label: "Completed", value: stats.done, color: "#10B981" },
          { label: "High Priority", value: stats.high, color: "#EF4444" },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.3 }}>{s.label}</span>
            <span style={{ color: "#E2E8F0", marginLeft: 8 }}>|</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "#475569" }}>
          🕐 {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      </div>

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
                { key: "all", label: "All" },
                { key: "waiting", label: "Active" },
                { key: "high", label: "🔴 High" },
                { key: "done", label: "Done" },
              ].map(f => (
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
            {filteredQueue.length === 0 ? (
              <div style={{ textAlign: "center", color: "#94A3B8", padding: "40px 0", fontSize: 13 }}>
                No patients in this view
              </div>
            ) : filteredQueue.map(entry => (
              <QueueCard
                key={entry.id}
                entry={entry}
                isActive={entry.id === activeId}
                onClick={() => handleSelectPatient(entry.id)}
              />
            ))}
          </div>
          <div style={{ padding: "10px 16px", borderTop: "1px solid #E2E8F0", background: "#FFFFFF" }}>
            <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "center" }}>
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
                    {active.patient.name[0]}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1E293B" }}>{active.patient.name}</h2>
                      <span style={{ background: "#F1F5F9", color: "#64748B", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>{active.token}</span>
                      <StatusBadge status={active.status} />
                    </div>
                    <div style={{ display: "flex", gap: 14, marginTop: 5, flexWrap: "wrap" }}>
                      {[
                        `${active.patient.age} years`,
                        active.patient.gender,
                        `Blood: ${active.patient.bloodGroup}`,
                        `📞 ${active.patient.phone}`,
                        `Checked in: ${active.checkedInAt}`,
                        TYPE_LABELS[active.appointmentType],
                      ].map((item, i) => (
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
                    disabled={active.status === "consulted" || active.status === "no_show"}
                    style={{
                      background: "#FFF1F2", color: "#EF4444", border: "1.5px solid #FECACA",
                      borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer",
                      opacity: active.status === "consulted" || active.status === "no_show" ? 0.45 : 1,
                    }}
                  >No Show</button>
                  <button
                    onClick={handleMarkConsulted}
                    disabled={active.status === "consulted"}
                    style={{
                      background: active.status === "consulted"
                        ? "#F1F5F9"
                        : "linear-gradient(135deg,#22C55E,#16A34A)",
                      color: active.status === "consulted" ? "#94A3B8" : "#FFFFFF",
                      border: "none", borderRadius: 8, padding: "8px 20px",
                      fontWeight: 700, fontSize: 13, cursor: active.status === "consulted" ? "default" : "pointer",
                      boxShadow: active.status === "consulted" ? "none" : "0 2px 8px rgba(34,197,94,0.3)",
                    }}
                  >
                    {active.status === "consulted" ? "✓ Consulted" : "✓ Mark as Consulted"}
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", padding: "0 24px", display: "flex", gap: 4 }}>
              {[
                { key: "assessment", label: "Assessment & Vitals" },
                { key: "history", label: "Medical History" },
                { key: "notes", label: "Doctor Notes" },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  background: "none", border: "none", borderBottom: `2.5px solid ${tab === t.key ? "#3B82F6" : "transparent"}`,
                  color: tab === t.key ? "#3B82F6" : "#64748B", fontWeight: tab === t.key ? 700 : 500,
                  fontSize: 13, padding: "12px 16px", cursor: "pointer", transition: "all 0.15s",
                }}>{t.label}</button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

              {tab === "assessment" && (
                <div style={{ display: "grid", gap: 20 }}>
                  {/* Chief Complaint */}
                  <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
                    <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5 }}>Chief Complaint</h3>
                    <p style={{ margin: 0, fontSize: 15, color: "#1E293B", lineHeight: 1.6 }}>{active.assessment.chiefComplaint}</p>
                    <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <PriorityBadge priority={active.assessment.triagePriority} />
                      <span style={{ fontSize: 12, color: "#64748B" }}>Triage Score: <strong>{active.assessment.triageScore}/10</strong></span>
                    </div>
                  </div>

                  {/* Vitals */}
                  <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
                    <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5 }}>Vitals</h3>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <VitalBadge label="BP" value={active.assessment.vitals.bp} unit="mmHg" alert={parseInt(active.assessment.vitals.bp) > 140} />
                      <VitalBadge label="Pulse" value={active.assessment.vitals.pulse} unit="bpm" alert={active.assessment.vitals.pulse > 100} />
                      <VitalBadge label="Temp" value={active.assessment.vitals.temp} unit="°F" alert={active.assessment.vitals.temp > 100} />
                      <VitalBadge label="SpO₂" value={`${active.assessment.vitals.spo2}%`} alert={active.assessment.vitals.spo2 < 95} />
                      <VitalBadge label="Weight" value={active.assessment.vitals.weight} unit="kg" />
                    </div>
                  </div>

                  {/* Nurse Notes */}
                  <div style={{ background: "#FFFBEB", borderRadius: 12, padding: 20, border: "1px solid #FDE68A" }}>
                    <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: 0.5 }}>🩺 Nurse Assessment Notes</h3>
                    <p style={{ margin: 0, fontSize: 14, color: "#78350F", lineHeight: 1.6 }}>{active.assessment.notes}</p>
                  </div>
                </div>
              )}

              {tab === "history" && (
                <div style={{ display: "grid", gap: 16 }}>
                  {[
                    { title: "Allergies", items: active.patient.allergies, emptyMsg: "No known allergies", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
                    { title: "Chronic Conditions", items: active.patient.chronicConditions, emptyMsg: "None recorded", color: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE" },
                    { title: "Current Medications", items: active.patient.currentMedications, emptyMsg: "None", color: "#059669", bg: "#F0FDF4", border: "#A7F3D0" },
                  ].map(section => (
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
                  <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
                    <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5 }}>Emergency Contact</h3>
                    <div style={{ fontSize: 14, color: "#1E293B" }}>
                      <strong>{active.patient.emergencyContact.name}</strong>
                      <span style={{ color: "#64748B" }}> ({active.patient.emergencyContact.relation})</span>
                      <span style={{ marginLeft: 12, color: "#3B82F6" }}>📞 {active.patient.emergencyContact.phone}</span>
                    </div>
                  </div>
                </div>
              )}

              {tab === "notes" && (
                <div style={{ display: "grid", gap: 16 }}>
                  <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
                    <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5 }}>Consultation Notes</h3>
                    <textarea
                      value={notes[active.id] || ""}
                      onChange={e => setNotes(prev => ({ ...prev, [active.id]: e.target.value }))}
                      placeholder={`Add consultation notes for ${active.patient.name}...\n\nInclude:\n• Diagnosis / Differential diagnosis\n• Examination findings\n• Investigations ordered\n• Treatment plan\n• Follow-up instructions`}
                      style={{
                        width: "100%", minHeight: 220, border: "1.5px solid #E2E8F0",
                        borderRadius: 8, padding: "12px 14px", fontSize: 14, color: "#1E293B",
                        lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box",
                        fontFamily: "inherit", background: "#F8FAFC",
                      }}
                      onFocus={e => e.target.style.borderColor = "#3B82F6"}
                      onBlur={e => e.target.style.borderColor = "#E2E8F0"}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 10 }}>
                      <span style={{ fontSize: 12, color: "#94A3B8" }}>
                        {(notes[active.id] || "").length} characters
                      </span>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {saveSuccess === "notes" && (
                          <span style={{ color: "#059669", fontWeight: 700, fontSize: 13 }}>✓ Notes saved</span>
                        )}
                        <button
                          onClick={handleSaveNotes}
                          disabled={saving || !(notes[active.id] || "").trim()}
                          style={{
                            background: !(notes[active.id] || "").trim()
                              ? "#F1F5F9"
                              : "linear-gradient(135deg,#3B82F6,#2563EB)",
                            color: !(notes[active.id] || "").trim() ? "#94A3B8" : "#FFFFFF",
                            border: "none", borderRadius: 8, padding: "9px 22px",
                            fontWeight: 700, fontSize: 13, cursor: "pointer",
                            boxShadow: !(notes[active.id] || "").trim() ? "none" : "0 2px 8px rgba(59,130,246,0.3)",
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
              <div style={{ fontSize: 48, marginBottom: 12 }}>🩺</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Select a patient from the queue</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Click any patient card on the left to view details</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
