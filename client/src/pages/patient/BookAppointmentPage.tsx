import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

const DOCTORS = [
  { id: 1, name: "Dr. Kavitha Ramesh", spec: "Cardiologist", dept: "Cardiology", tag: "Heart", exp: "12 yrs", fee: 600, avail: "available", rating: "4.9", initials: "KR", color: "bg-blue-100 text-blue-700" },
  { id: 2, name: "Dr. Arun Mehta", spec: "Orthopaedic Surgeon", dept: "Orthopedics", tag: "Bones", exp: "9 yrs", fee: 500, avail: "available", rating: "4.7", initials: "AM", color: "bg-teal-100 text-teal-700" },
  { id: 3, name: "Dr. Priya Nair", spec: "General Physician", dept: "General Medicine", tag: "General", exp: "7 yrs", fee: 350, avail: "busy", rating: "4.8", initials: "PN", color: "bg-orange-100 text-orange-700" },
  { id: 4, name: "Dr. Suresh Kumar", spec: "Paediatrician", dept: "Pediatrics", tag: "Children", exp: "14 yrs", fee: 450, avail: "available", rating: "4.9", initials: "SK", color: "bg-green-100 text-green-700" },
  { id: 5, name: "Dr. Anitha Sharma", spec: "Dermatologist", dept: "Dermatology", tag: "Skin", exp: "6 yrs", fee: 400, avail: "available", rating: "4.6", initials: "AS", color: "bg-pink-100 text-pink-700" },
  { id: 6, name: "Dr. Ravi Chandran", spec: "Neurologist", dept: "Neurology", tag: "Brain", exp: "16 yrs", fee: 750, avail: "busy", rating: "4.8", initials: "RC", color: "bg-purple-100 text-purple-700" },
];

const SLOTS = ["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM"];
const SPECS = ["All", "Heart", "Bones", "Skin", "Children", "Brain", "General"];
const STEPS = ["Find doctor", "Assessment", "Schedule", "Confirm"];
const TODAY_ISO = new Date().toISOString().slice(0, 10);

export default function BookAppointmentPage({ onBooked }: { onBooked: () => void }) {
  const [step, setStep] = useState(1);
  const [selectedDoc, setSelectedDoc] = useState<number | null>(null);
  const [specFilter, setSpecFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("");
  const [availFilter, setAvailFilter] = useState("");
  const [search, setSearch] = useState("");

  // STEP 2 — pre-visit assessment fields
  const [symptoms, setSymptoms] = useState("");
  const [painLevel, setPainLevel] = useState("0 — No pain");
  const [duration, setDuration] = useState("Today only");
  const [medications, setMedications] = useState("");
  const [allergies, setAllergies] = useState("");
  const [apptType, setApptType] = useState("Scheduled consultation");
  const [language, setLanguage] = useState("English");
  const [notes, setNotes] = useState("");
  const [step2Error, setStep2Error] = useState<string | null>(null);

  // STEP 3 — schedule
  const [appointmentDate, setAppointmentDate] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("Morning (9 AM – 12 PM)");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [step3Error, setStep3Error] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = DOCTORS.filter((d) => {
    if (deptFilter && d.dept !== deptFilter) return false;
    if (availFilter && d.avail !== availFilter) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (specFilter !== "All" && d.tag !== specFilter) return false;
    return true;
  });

  const doc = DOCTORS.find((d) => d.id === selectedDoc);

  const goToStep3 = () => {
    if (!symptoms.trim()) {
      setStep2Error("Please describe your main symptoms or reason for visit.");
      return;
    }
    setStep2Error(null);
    setStep(3);
  };

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

  const handleConfirm = async () => {
    if (!doc || !selectedSlot || !appointmentDate) {
      toast.error("Some appointment details are missing. Please review the previous steps.");
      return;
    }
    setIsSubmitting(true);
    try {
      // Simulated request latency — replace with a real POST to
      // /api/appointments once the booking endpoint is wired up.
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          // Simulate an occasional server-side conflict so the error path is exercised.
          Math.random() < 0.05 ? reject(new Error("That slot was just taken. Please pick another.")) : resolve();
        }, 700);
      });
      toast.success("🎉 Appointment booked successfully! Check your queue status.", { duration: 6000 });
      onBooked();
    } catch (err: any) {
      toast.error(err?.message || "Couldn't confirm your appointment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Book an appointment</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Choose a doctor and tell us about your concern</p>
      </div>

      {/* Step bar */}
      <div className="flex items-center mb-8 overflow-x-auto">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <div key={n} className="flex items-center flex-1 min-w-[80px]">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                  done ? "bg-teal-600 border-teal-600 text-white"
                  : active ? "border-teal-600 text-teal-600 bg-white dark:bg-slate-800"
                  : "border-gray-200 text-gray-400 bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                }`}>
                  {done ? "✓" : n}
                </div>
                <span className={`text-xs mt-1 whitespace-nowrap ${active ? "text-teal-600 font-medium" : "text-gray-400 dark:text-slate-500"}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-4 ${n < step ? "bg-teal-600" : "bg-gray-200 dark:bg-slate-700"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div>
          <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-2xl border border-gray-100 p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Department</label>
                <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                  <option value="">All departments</option>
                  {["Cardiology", "Orthopedics", "Pediatrics", "General Medicine", "Dermatology", "Neurology"].map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Availability</label>
                <select value={availFilter} onChange={(e) => setAvailFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                  <option value="">Any</option>
                  <option value="available">Available now</option>
                  <option value="busy">Busy</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Search doctor</label>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Dr. name..." className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200" />
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap mb-4">
            {SPECS.map((s) => (
              <button key={s} onClick={() => setSpecFilter(s)}
                className={`px-4 py-1.5 rounded-full text-sm border transition-all ${specFilter === s ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-teal-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"}`}>
                {s}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {filtered.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 p-8 text-center text-sm text-gray-400">
                No doctors match those filters. Try widening your search.
              </div>
            ) : (
              filtered.map((d) => (
                <div key={d.id} onClick={() => setSelectedDoc(d.id)}
                  className={`bg-white dark:bg-slate-800 rounded-2xl border-2 p-4 cursor-pointer transition-all hover:-translate-y-0.5 ${
                    selectedDoc === d.id ? "border-teal-500 bg-teal-50 dark:bg-teal-500/10" : "border-gray-100 dark:border-slate-700 hover:border-teal-300"
                  }`}>
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold mb-3 ${d.color}`}>{d.initials}</div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-slate-100">{d.name}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-3">{d.spec} · {d.dept}</div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.avail === "available" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      ● {d.avail === "available" ? "Available" : "Busy"}
                    </span>
                    <span className="text-xs text-gray-400">₹{d.fee}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-400">
                    <span>⭐ {d.rating}</span>
                    <span>💼 {d.exp}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <button onClick={() => setStep(2)} disabled={!selectedDoc}
            className="bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-700 text-white px-8 py-2.5 rounded-xl text-sm font-medium transition-colors">
            Continue to assessment →
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold mb-5 flex items-center gap-2 text-gray-900 dark:text-slate-100">
            <span className="text-teal-600">📋</span> Pre-visit assessment
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">What brings you in today? <span className="text-red-500">*</span></label>
              <textarea
                rows={3}
                value={symptoms}
                onChange={(e) => { setSymptoms(e.target.value); if (step2Error) setStep2Error(null); }}
                placeholder="Describe your main symptoms or reason for visit..."
                className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-gray-50 focus:outline-none resize-none dark:bg-slate-900 dark:text-slate-200 ${step2Error ? "border-red-400 focus:border-red-500" : "border-gray-200 dark:border-slate-700 focus:border-teal-500"}`}
              />
              {step2Error && <p className="mt-1 text-xs text-red-500">{step2Error}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Pain level</label>
                <select value={painLevel} onChange={(e) => setPainLevel(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                  {["0 — No pain", "1-3 — Mild", "4-6 — Moderate", "7-9 — Severe", "10 — Emergency"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Duration of symptoms</label>
                <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                  {["Today only", "1-3 days", "4-7 days", "1-4 weeks", "More than a month"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Current medications (if any)</label>
              <input value={medications} onChange={(e) => setMedications(e.target.value)} placeholder="e.g. Metformin 500mg, Atorvastatin 20mg" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Known allergies</label>
              <input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g. Penicillin, Sulfa drugs" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Appointment type</label>
                <select value={apptType} onChange={(e) => setApptType(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                  {["Scheduled consultation", "Follow-up", "Walk-in"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Preferred language</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                  {["English", "Tamil", "Hindi", "Telugu"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Additional notes for the doctor</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Previous diagnoses, recent lab results, anything the doctor should know..." className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500 resize-none dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">← Back</button>
            <button onClick={goToStep3} className="flex-[2] py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors">Pick a time slot →</button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold mb-5 flex items-center gap-2 text-gray-900 dark:text-slate-100">
            <span className="text-teal-600">📅</span> Choose date & time
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Appointment date <span className="text-red-500">*</span></label>
              <input
                type="date"
                min={TODAY_ISO}
                value={appointmentDate}
                onChange={(e) => { setAppointmentDate(e.target.value); if (step3Error) setStep3Error(null); }}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-gray-50 focus:outline-none dark:bg-slate-900 dark:text-slate-200 ${step3Error ? "border-red-400" : "border-gray-200 dark:border-slate-700 focus:border-teal-500"}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Preferred time of day</label>
              <select value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                {["Morning (9 AM – 12 PM)", "Afternoon (12 PM – 4 PM)", "Evening (4 PM – 7 PM)"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-2">Available slots <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-2 mb-2">
            {SLOTS.map((s) => (
              <button key={s} onClick={() => { setSelectedSlot(s); if (step3Error) setStep3Error(null); }}
                className={`px-4 py-2 rounded-xl text-sm border transition-all ${selectedSlot === s ? "bg-teal-600 border-teal-600 text-white" : "bg-gray-50 border-gray-200 text-gray-700 hover:border-teal-400 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"}`}>
                {s}
              </button>
            ))}
          </div>
          {step3Error && <p className="mb-4 text-xs text-red-500">{step3Error}</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">← Back</button>
            <button onClick={goToStep4} className="flex-[2] py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors">Review & confirm →</button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold mb-5 flex items-center gap-2 text-gray-900 dark:text-slate-100">
            <span className="text-teal-600">✅</span> Confirm your appointment
          </h2>
          <div className="bg-teal-50 dark:bg-teal-500/10 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold ${doc?.color}`}>{doc?.initials}</div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-slate-100">{doc?.name}</div>
                <div className="text-xs text-teal-700 dark:text-teal-400">{doc?.spec} · {doc?.dept}</div>
              </div>
            </div>
            <div className="border-t border-teal-200 dark:border-teal-500/20 pt-3 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500 dark:text-slate-400 text-xs">Date</span><br /><strong className="dark:text-slate-100">{appointmentDate || "—"}</strong></div>
              <div><span className="text-gray-500 dark:text-slate-400 text-xs">Time</span><br /><strong className="dark:text-slate-100">{selectedSlot || "—"}</strong></div>
              <div><span className="text-gray-500 dark:text-slate-400 text-xs">Type</span><br /><strong className="dark:text-slate-100">{apptType}</strong></div>
              <div><span className="text-gray-500 dark:text-slate-400 text-xs">Fee</span><br /><strong className="dark:text-slate-100">₹{doc?.fee}</strong></div>
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 mb-5 flex gap-2 items-start text-sm text-amber-700 dark:text-amber-400">
            <span>⚠️</span>
            Please arrive 10 minutes early with a valid photo ID. Bring all previous medical records.
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(3)} disabled={isSubmitting} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">← Edit</button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="flex-[2] py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Confirming..." : "Confirm booking"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
