import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import apiClient from "../../services/api.client";
import { useAuthStore } from "../../store/authStore";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Department {
  _id: string;
  name: string;
  code: string;
  avgConsultationTime: number;
  isActive: boolean;
}

interface Doctor {
  _id: string;
  specialization: string;
  consultationFee: number;
  experienceYears: number;
  availabilityStatus: "available" | "busy" | "on_break" | "off_duty";
  rating: number;
  isOnLeave: boolean;
  department: { _id: string; name: string; code: string };
  user: { name: string; email?: string };
}

interface TriageResult {
  severity: "critical" | "urgent" | "moderate" | "low";
  score: number;
  suggestedAppointmentType: "scheduled" | "follow_up" | "walk_in" | "emergency";
  suggestedPriority: "emergency" | "high" | "normal" | "low";
}

interface NoShowRisk {
  risk_level: "Low" | "Medium" | "High";
  no_show_probability: number;
  recommended_action: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
];

const SLOT_LABELS: Record<string, string> = {
  "09:00": "9:00 AM", "09:30": "9:30 AM", "10:00": "10:00 AM", "10:30": "10:30 AM",
  "11:00": "11:00 AM", "11:30": "11:30 AM", "14:00": "2:00 PM", "14:30": "2:30 PM",
  "15:00": "3:00 PM", "15:30": "3:30 PM", "16:00": "4:00 PM", "16:30": "4:30 PM",
};

const APPT_TYPE_MAP: Record<string, "scheduled" | "follow_up" | "walk_in"> = {
  "Scheduled consultation": "scheduled",
  "Follow-up": "follow_up",
  "Walk-in": "walk_in",
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  critical: { label: "Critical",    color: "text-red-700",    bg: "bg-red-50 border-red-200",    icon: "🚨" },
  urgent:   { label: "Urgent",      color: "text-orange-700", bg: "bg-orange-50 border-orange-200", icon: "⚠️" },
  moderate: { label: "Moderate",    color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",  icon: "🔶" },
  low:      { label: "Non-urgent",  color: "text-green-700",  bg: "bg-green-50 border-green-200",  icon: "✅" },
};

const RISK_CONFIG: Record<string, { color: string; bg: string }> = {
  High:   { color: "text-red-700",   bg: "bg-red-50 border-red-200" },
  Medium: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  Low:    { color: "text-green-700", bg: "bg-green-50 border-green-200" },
};

const STEPS = ["Find doctor", "Assessment", "Schedule", "Confirm"];
const TODAY_ISO = new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function avatarColor(id: string): string {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-teal-100 text-teal-700",
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
    "bg-orange-100 text-orange-700",
    "bg-green-100 text-green-700",
    "bg-indigo-100 text-indigo-700",
    "bg-rose-100 text-rose-700",
  ];
  // Stable colour derived from the last hex digit of the id
  const idx = parseInt(id.slice(-2), 16) % colors.length;
  return colors[idx];
}

function extractApiError(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? "Something went wrong.";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BookAppointmentPage({ onBooked }: { onBooked: () => void }) {
  const user    = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile) as { _id?: string } | null;

  // The patient's MongoDB _id lives on profile._id (populated by /auth/me)
  const patientId = profile?._id ?? "";

  // ── Data loading ──────────────────────────────────────────────────────────
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors]         = useState<Doctor[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError]     = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    setLoadingData(true);
    setLoadError(null);
    try {
      const [deptRes, docRes] = await Promise.all([
        apiClient.get("/departments", { params: { isActive: true, limit: 100 } }),
        apiClient.get("/doctors",     { params: { limit: 100 } }),
      ]);
      setDepartments(deptRes.data.data.departments ?? deptRes.data.data ?? []);
      setDoctors(docRes.data.data.doctors ?? docRes.data.data ?? []);
    } catch (err) {
      setLoadError(extractApiError(err));
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  // ── Step navigation ───────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // ── Step 1 — Doctor selection ─────────────────────────────────────────────
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [deptFilter, setDeptFilter]             = useState("");
  const [availFilter, setAvailFilter]           = useState("");
  const [search, setSearch]                     = useState("");

  const filteredDoctors = doctors.filter((d) => {
    if (d.isOnLeave) return false;
    if (deptFilter && d.department?._id !== deptFilter) return false;
    if (availFilter && d.availabilityStatus !== availFilter) return false;
    if (search && !d.user?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedDoctor = doctors.find((d) => d._id === selectedDoctorId) ?? null;

  // ── Step 2 — Assessment ───────────────────────────────────────────────────
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [symptomInput, setSymptomInput]     = useState("");
  const [symptoms, setSymptoms]             = useState<string[]>([]);
  const [apptType, setApptType]             = useState("Scheduled consultation");
  const [notes, setNotes]                   = useState("");
  const [step2Error, setStep2Error]         = useState<string | null>(null);

  // Assessment result (returned after submit)
  const [assessmentId, setAssessmentId]   = useState<string | null>(null);
  const [triageResult, setTriageResult]   = useState<TriageResult | null>(null);
  const [noShowRisk, setNoShowRisk]       = useState<NoShowRisk | null>(null);
  const [submittingAssessment, setSubmittingAssessment] = useState(false);

  const addSymptom = () => {
    const trimmed = symptomInput.trim();
    if (!trimmed || symptoms.includes(trimmed)) return;
    setSymptoms((prev) => [...prev, trimmed]);
    setSymptomInput("");
  };

  const removeSymptom = (s: string) =>
    setSymptoms((prev) => prev.filter((x) => x !== s));

  const handleSymptomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSymptom();
    }
  };

  // Submit assessment → server, get triage + no-show risk back
  const submitAssessmentAndAdvance = async () => {
    if (!chiefComplaint.trim()) {
      setStep2Error("Please describe your chief complaint.");
      return;
    }
    if (symptoms.length === 0) {
      setStep2Error("Please add at least one symptom.");
      return;
    }
    if (!patientId) {
      setStep2Error("Your patient profile could not be found. Please refresh and try again.");
      return;
    }

    setStep2Error(null);
    setSubmittingAssessment(true);

    try {
      // 1. Submit assessment — server runs triage engine
      const assessRes = await apiClient.post("/assessments", {
        patientId,
        chiefComplaint: chiefComplaint.trim(),
        symptoms,
        notes: notes.trim() || undefined,
      });

      const { assessment, suggestedAppointmentType, suggestedPriority } =
        assessRes.data.data;

      setAssessmentId(assessment._id);
      setTriageResult({
        severity:               assessment.triageSeverity,
        score:                  assessment.triageScore,
        suggestedAppointmentType,
        suggestedPriority,
      });

      // 2. Fetch no-show risk preview via score-only (no patient record needed)
      try {
        const scoreRes = await apiClient.post("/assessments/score-only", {
          chiefComplaint: chiefComplaint.trim(),
          symptoms,
        });
        // score-only returns triage only; no-show risk is available after
        // link-appointment; show a placeholder here and update after booking.
        // We surface what we have — severity & score are already in triage.
        void scoreRes; // used to prefill UI if we add vitals later
      } catch {
        // Non-critical — triage already captured above
      }

      setStep(3);
    } catch (err) {
      setStep2Error(extractApiError(err));
    } finally {
      setSubmittingAssessment(false);
    }
  };

  // ── Step 3 — Schedule ─────────────────────────────────────────────────────
  const [appointmentDate, setAppointmentDate] = useState("");
  const [selectedSlot, setSelectedSlot]       = useState<string | null>(null);
  const [step3Error, setStep3Error]           = useState<string | null>(null);

  const goToStep4 = () => {
    if (!appointmentDate) {
      setStep3Error("Please choose an appointment date.");
      return;
    }
    if (appointmentDate < TODAY_ISO) {
      setStep3Error("Appointment date can't be in the past.");
      return;
    }
    if (!selectedSlot) {
      setStep3Error("Please pick an available time slot.");
      return;
    }
    setStep3Error(null);
    setStep(4);
  };

  // ── Step 4 — Confirm & book ───────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selectedDoctor || !selectedSlot || !appointmentDate || !patientId) {
      toast.error("Some appointment details are missing. Please review the previous steps.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Book appointment
      const bookRes = await apiClient.post("/appointments", {
        patient:           patientId,
        doctor:            selectedDoctor._id,
        department:        selectedDoctor.department._id,
        appointmentType:   APPT_TYPE_MAP[apptType] ?? "scheduled",
        scheduledDate:     appointmentDate,
        scheduledTimeSlot: selectedSlot,
        reasonForVisit:    chiefComplaint.trim(),
        symptoms,
        notes:             notes.trim() || undefined,
        priority:          triageResult?.suggestedPriority ?? "normal",
      });

      const appointment = bookRes.data.data?.appointment ?? bookRes.data.data;

      // 2. Link the assessment to the appointment (fires no-show prediction on server)
      if (assessmentId && appointment?._id) {
        try {
          const linkRes = await apiClient.patch(
            `/assessments/${assessmentId}/link-appointment`,
            { appointmentId: appointment._id }
          );
          const risk = linkRes.data.data?.noShowRisk;
          if (risk) setNoShowRisk(risk);
        } catch {
          // Non-blocking — appointment is already booked
        }
      }

      toast.success("🎉 Appointment booked! Check your queue status.", { duration: 6000 });
      onBooked();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading / error screen ────────────────────────────────────────────────
  if (loadingData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col items-center gap-4 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-sm">Loading doctors and departments…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <p className="text-sm text-slate-600 dark:text-slate-400">{loadError}</p>
        <button
          onClick={loadInitialData}
          className="flex items-center gap-2 text-sm text-teal-600 border border-teal-300 rounded-xl px-4 py-2 hover:bg-teal-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
          Book an appointment
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          {user?.name ? `Hello, ${user.name.split(" ")[0]} —` : ""} choose a doctor and tell us about your concern
        </p>
      </div>

      {/* Step bar */}
      <div className="flex items-center mb-8 overflow-x-auto">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done   = n < step;
          const active = n === step;
          return (
            <div key={n} className="flex items-center flex-1 min-w-[80px]">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                  done   ? "bg-teal-600 border-teal-600 text-white"
                  : active ? "border-teal-600 text-teal-600 bg-white dark:bg-slate-800"
                           : "border-gray-200 text-gray-400 bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                }`}>
                  {done ? "✓" : n}
                </div>
                <span className={`text-xs mt-1 whitespace-nowrap ${active ? "text-teal-600 font-medium" : "text-gray-400 dark:text-slate-500"}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-4 ${n < step ? "bg-teal-600" : "bg-gray-200 dark:bg-slate-700"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: Find a doctor ─────────────────────────────────────────── */}
      {step === 1 && (
        <div>
          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-2xl border border-gray-100 p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Department</label>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                >
                  <option value="">All departments</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Availability</label>
                <select
                  value={availFilter}
                  onChange={(e) => setAvailFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                >
                  <option value="">Any</option>
                  <option value="available">Available now</option>
                  <option value="busy">Busy</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Search doctor</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Dr. name…"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Doctor grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {filteredDoctors.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 p-10 text-center text-sm text-gray-400">
                {doctors.length === 0
                  ? "No doctors are registered yet."
                  : "No doctors match those filters. Try widening your search."}
              </div>
            ) : (
              filteredDoctors.map((d) => {
                const name     = d.user?.name ?? "Doctor";
                const initials = getInitials(name);
                const color    = avatarColor(d._id);
                const isAvail  = d.availabilityStatus === "available";
                const selected = selectedDoctorId === d._id;

                return (
                  <div
                    key={d._id}
                    onClick={() => setSelectedDoctorId(d._id)}
                    className={`bg-white dark:bg-slate-800 rounded-2xl border-2 p-4 cursor-pointer transition-all hover:-translate-y-0.5 ${
                      selected
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-500/10"
                        : "border-gray-100 dark:border-slate-700 hover:border-teal-300"
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold mb-3 ${color}`}>
                      {initials}
                    </div>
                    <div className="font-semibold text-sm text-gray-900 dark:text-slate-100">{name}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                      {d.specialization} · {d.department?.name ?? ""}
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isAvail ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        ● {isAvail ? "Available" : d.availabilityStatus.replace("_", " ")}
                      </span>
                      <span className="text-xs text-gray-400">₹{d.consultationFee}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-400">
                      {d.rating > 0 && <span>⭐ {d.rating.toFixed(1)}</span>}
                      {d.experienceYears > 0 && <span>💼 {d.experienceYears} yrs</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!selectedDoctorId}
            className="bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-700 text-white px-8 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Continue to assessment →
          </button>
        </div>
      )}

      {/* ── STEP 2: Pre-visit assessment ──────────────────────────────────── */}
      {step === 2 && (
        <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold mb-1 flex items-center gap-2 text-gray-900 dark:text-slate-100">
            <span className="text-teal-600">📋</span> Pre-visit assessment
          </h2>
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-5">
            Our AI triage engine will evaluate your symptoms and recommend an appointment priority.
          </p>

          <div className="space-y-4">
            {/* Chief complaint */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">
                Chief complaint <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                value={chiefComplaint}
                onChange={(e) => { setChiefComplaint(e.target.value); if (step2Error) setStep2Error(null); }}
                placeholder="Main reason for your visit in one sentence (e.g. 'Chest pain and shortness of breath for 2 days')"
                className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-gray-50 focus:outline-none resize-none dark:bg-slate-900 dark:text-slate-200 ${
                  step2Error ? "border-red-400 focus:border-red-500" : "border-gray-200 dark:border-slate-700 focus:border-teal-500"
                }`}
              />
            </div>

            {/* Symptoms */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">
                Symptoms <span className="text-red-500">*</span>
                <span className="ml-1 font-normal text-gray-400">(press Enter or comma to add)</span>
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  value={symptomInput}
                  onChange={(e) => setSymptomInput(e.target.value)}
                  onKeyDown={handleSymptomKeyDown}
                  placeholder="e.g. fever, headache, nausea…"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={addSymptom}
                  disabled={!symptomInput.trim()}
                  className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium disabled:opacity-40 hover:bg-teal-700 transition-colors"
                >
                  Add
                </button>
              </div>
              {symptoms.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {symptoms.map((s) => (
                    <span
                      key={s}
                      className="flex items-center gap-1 text-xs bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30 rounded-full px-3 py-1"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => removeSymptom(s)}
                        className="hover:text-red-500 transition-colors ml-0.5 font-bold leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Appointment type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Appointment type</label>
              <select
                value={apptType}
                onChange={(e) => setApptType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
              >
                {Object.keys(APPT_TYPE_MAP).map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>

            {/* Additional notes */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">
                Additional notes for the doctor
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Previous diagnoses, recent lab results, medications, allergies…"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500 resize-none dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
              />
            </div>

            {step2Error && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {step2Error}
              </p>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => { setStep(1); setStep2Error(null); }}
              disabled={submittingAssessment}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              ← Back
            </button>
            <button
              onClick={submitAssessmentAndAdvance}
              disabled={submittingAssessment || !chiefComplaint.trim() || symptoms.length === 0}
              className="flex-[2] py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submittingAssessment && <Loader2 className="h-4 w-4 animate-spin" />}
              {submittingAssessment ? "Running triage…" : "Submit & pick a time slot →"}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Schedule ─────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Triage result card */}
          {triageResult && (() => {
            const cfg = SEVERITY_CONFIG[triageResult.severity] ?? SEVERITY_CONFIG.low;
            return (
              <div className={`rounded-xl border p-4 ${cfg.bg}`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">{cfg.icon}</span>
                  <div className="flex-1">
                    <div className={`text-sm font-semibold ${cfg.color}`}>
                      Triage: {cfg.label}
                      <span className="ml-2 font-normal opacity-70">
                        (score {triageResult.score})
                      </span>
                    </div>
                    <div className="text-xs mt-0.5 opacity-80 text-gray-600 dark:text-slate-400">
                      Suggested appointment type:{" "}
                      <strong>{triageResult.suggestedAppointmentType.replace("_", " ")}</strong>
                      {" · "}Priority: <strong>{triageResult.suggestedPriority}</strong>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Date & slot picker */}
          <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-2xl border border-gray-100 p-6">
            <h2 className="text-base font-semibold mb-5 flex items-center gap-2 text-gray-900 dark:text-slate-100">
              <span className="text-teal-600">📅</span> Choose date & time
            </h2>

            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">
                Appointment date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                min={TODAY_ISO}
                value={appointmentDate}
                onChange={(e) => { setAppointmentDate(e.target.value); if (step3Error) setStep3Error(null); }}
                className={`w-full sm:w-64 px-3 py-2.5 rounded-lg border text-sm bg-gray-50 focus:outline-none dark:bg-slate-900 dark:text-slate-200 ${
                  step3Error && !appointmentDate ? "border-red-400" : "border-gray-200 dark:border-slate-700 focus:border-teal-500"
                }`}
              />
            </div>

            <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-2">
              Available slots <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {TIME_SLOTS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setSelectedSlot(s); if (step3Error) setStep3Error(null); }}
                  className={`px-4 py-2 rounded-xl text-sm border transition-all ${
                    selectedSlot === s
                      ? "bg-teal-600 border-teal-600 text-white"
                      : "bg-gray-50 border-gray-200 text-gray-700 hover:border-teal-400 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  {SLOT_LABELS[s]}
                </button>
              ))}
            </div>

            {step3Error && (
              <p className="mb-3 text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {step3Error}
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setStep(2); setStep3Error(null); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={goToStep4}
                className="flex-[2] py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors"
              >
                Review & confirm →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: Confirm ──────────────────────────────────────────────── */}
      {step === 4 && selectedDoctor && (
        <div className="space-y-4">
          {/* Appointment summary card */}
          <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-2xl border border-gray-100 p-6">
            <h2 className="text-base font-semibold mb-5 flex items-center gap-2 text-gray-900 dark:text-slate-100">
              <span className="text-teal-600">✅</span> Confirm your appointment
            </h2>

            <div className="bg-teal-50 dark:bg-teal-500/10 rounded-xl p-4 mb-4">
              {/* Doctor summary */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold ${avatarColor(selectedDoctor._id)}`}>
                  {getInitials(selectedDoctor.user?.name ?? "Doctor")}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-slate-100">
                    {selectedDoctor.user?.name}
                  </div>
                  <div className="text-xs text-teal-700 dark:text-teal-400">
                    {selectedDoctor.specialization} · {selectedDoctor.department?.name}
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="border-t border-teal-200 dark:border-teal-500/20 pt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-slate-400 text-xs">Date</span>
                  <br />
                  <strong className="dark:text-slate-100">{appointmentDate}</strong>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-slate-400 text-xs">Time</span>
                  <br />
                  <strong className="dark:text-slate-100">{selectedSlot ? SLOT_LABELS[selectedSlot] : "—"}</strong>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-slate-400 text-xs">Type</span>
                  <br />
                  <strong className="dark:text-slate-100">{apptType}</strong>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-slate-400 text-xs">Consultation fee</span>
                  <br />
                  <strong className="dark:text-slate-100">₹{selectedDoctor.consultationFee}</strong>
                </div>
              </div>
            </div>

            {/* Triage summary (compact) */}
            {triageResult && (() => {
              const cfg = SEVERITY_CONFIG[triageResult.severity];
              return (
                <div className={`rounded-xl border p-3 mb-4 flex items-center gap-2 text-sm ${cfg.bg}`}>
                  <span>{cfg.icon}</span>
                  <span className={cfg.color}>
                    Triage: <strong>{cfg.label}</strong> · Priority: <strong>{triageResult.suggestedPriority}</strong>
                  </span>
                </div>
              );
            })()}

            {/* No-show risk (if already available) */}
            {noShowRisk && (() => {
              const cfg = RISK_CONFIG[noShowRisk.risk_level] ?? RISK_CONFIG.Low;
              return (
                <div className={`rounded-xl border p-3 mb-4 text-sm ${cfg.bg}`}>
                  <div className={`font-medium ${cfg.color}`}>
                    No-show risk: {noShowRisk.risk_level}{" "}
                    <span className="font-normal opacity-70">
                      ({Math.round(noShowRisk.no_show_probability * 100)}%)
                    </span>
                  </div>
                  {noShowRisk.recommended_action && (
                    <div className="text-xs mt-0.5 text-gray-500 dark:text-slate-400">
                      {noShowRisk.recommended_action}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Advisory */}
            <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 mb-5 flex gap-2 items-start text-sm text-amber-700 dark:text-amber-400">
              <span>⚠️</span>
              Please arrive 10 minutes early with a valid photo ID. Bring all previous medical records.
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                ← Edit
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-[2] py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? "Confirming…" : "Confirm booking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
