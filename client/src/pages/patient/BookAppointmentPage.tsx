import { useState } from "react";
import toast from "react-hot-toast";

const DOCTORS = [
  { id: 1, name: "Dr. Kavitha Ramesh", spec: "Cardiologist", dept: "Cardiology", tag: "Heart", exp: "12 yrs", fee: 600, avail: "available", rating: "4.9", initials: "KR", color: "bg-blue-100 text-blue-700" },
  { id: 2, name: "Dr. Arun Mehta", spec: "Orthopaedic Surgeon", dept: "Orthopedics", tag: "Bones", exp: "9 yrs", fee: 500, avail: "available", rating: "4.7", initials: "AM", color: "bg-teal-100 text-teal-700" },
  { id: 3, name: "Dr. Priya Nair", spec: "General Physician", dept: "General Medicine", tag: "General", exp: "7 yrs", fee: 350, avail: "busy", rating: "4.8", initials: "PN", color: "bg-orange-100 text-orange-700" },
  { id: 4, name: "Dr. Suresh Kumar", spec: "Paediatrician", dept: "Pediatrics", tag: "Children", exp: "14 yrs", fee: 450, avail: "available", rating: "4.9", initials: "SK", color: "bg-green-100 text-green-700" },
  { id: 5, name: "Dr. Anitha Sharma", spec: "Dermatologist", dept: "Dermatology", tag: "Skin", exp: "6 yrs", fee: 400, avail: "available", rating: "4.6", initials: "AS", color: "bg-pink-100 text-pink-700" },
  { id: 6, name: "Dr. Ravi Chandran", spec: "Neurologist", dept: "Neurology", tag: "Brain", exp: "16 yrs", fee: 750, avail: "busy", rating: "4.8", initials: "RC", color: "bg-purple-100 text-purple-700" },
];

const SLOTS = ["09:00 AM","09:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","02:00 PM","02:30 PM","03:00 PM","03:30 PM"];
const SPECS = ["All","Heart","Bones","Skin","Children","Brain","General"];
const STEPS = ["Find doctor","Assessment","Schedule","Confirm"];

export default function BookAppointmentPage({ onBooked }: { onBooked: () => void }) {
  const [step, setStep] = useState(1);
  const [selectedDoc, setSelectedDoc] = useState<number | null>(null);
  const [specFilter, setSpecFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("");
  const [availFilter, setAvailFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const filtered = DOCTORS.filter(d => {
    if (deptFilter && d.dept !== deptFilter) return false;
    if (availFilter && d.avail !== availFilter) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (specFilter !== "All" && d.tag !== specFilter) return false;
    return true;
  });

  const doc = DOCTORS.find(d => d.id === selectedDoc);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Book an appointment</h1>
        <p className="text-sm text-gray-500 mt-1">Choose a doctor and tell us about your concern</p>
      </div>

      {/* Step bar */}
      <div className="flex items-center mb-8">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <div key={n} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                  done ? "bg-teal-600 border-teal-600 text-white"
                  : active ? "border-teal-600 text-teal-600 bg-white"
                  : "border-gray-200 text-gray-400 bg-gray-50"
                }`}>
                  {done ? "✓" : n}
                </div>
                <span className={`text-xs mt-1 whitespace-nowrap ${active ? "text-teal-600 font-medium" : "text-gray-400"}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-4 ${n < step ? "bg-teal-600" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500">
                  <option value="">All departments</option>
                  {["Cardiology","Orthopedics","Pediatrics","General Medicine","Dermatology","Neurology"].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Availability</label>
                <select value={availFilter} onChange={e => setAvailFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500">
                  <option value="">Any</option>
                  <option value="available">Available now</option>
                  <option value="busy">Busy</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Search doctor</label>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Dr. name..." className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500" />
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap mb-4">
            {SPECS.map(s => (
              <button key={s} onClick={() => setSpecFilter(s)}
                className={`px-4 py-1.5 rounded-full text-sm border transition-all ${specFilter === s ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-teal-400"}`}>
                {s}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {filtered.map(d => (
              <div key={d.id} onClick={() => setSelectedDoc(d.id)}
                className={`bg-white rounded-2xl border-2 p-4 cursor-pointer transition-all hover:-translate-y-0.5 ${
                  selectedDoc === d.id ? "border-teal-500 bg-teal-50" : "border-gray-100 hover:border-teal-300"
                }`}>
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold mb-3 ${d.color}`}>{d.initials}</div>
                <div className="font-semibold text-sm text-gray-900">{d.name}</div>
                <div className="text-xs text-gray-500 mb-3">{d.spec} · {d.dept}</div>
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
            ))}
          </div>

          <button onClick={() => setStep(2)} disabled={!selectedDoc}
            className="bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-700 text-white px-8 py-2.5 rounded-xl text-sm font-medium transition-colors">
            Continue to assessment →
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold mb-5 flex items-center gap-2 text-gray-900">
            <span className="text-teal-600">📋</span> Pre-visit assessment
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">What brings you in today? <span className="text-red-500">*</span></label>
              <textarea rows={3} placeholder="Describe your main symptoms or reason for visit..." className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pain level</label>
                <select className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500">
                  {["0 — No pain","1-3 — Mild","4-6 — Moderate","7-9 — Severe","10 — Emergency"].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Duration of symptoms</label>
                <select className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500">
                  {["Today only","1-3 days","4-7 days","1-4 weeks","More than a month"].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Current medications (if any)</label>
              <input placeholder="e.g. Metformin 500mg, Atorvastatin 20mg" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Known allergies</label>
              <input placeholder="e.g. Penicillin, Sulfa drugs" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Appointment type</label>
                <select className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500">
                  {["Scheduled consultation","Follow-up","Walk-in"].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Preferred language</label>
                <select className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500">
                  {["English","Tamil","Hindi","Telugu"].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Additional notes for the doctor</label>
              <textarea rows={2} placeholder="Previous diagnoses, recent lab results, anything the doctor should know..." className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">← Back</button>
            <button onClick={() => setStep(3)} className="flex-[2] py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors">Pick a time slot →</button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold mb-5 flex items-center gap-2 text-gray-900">
            <span className="text-teal-600">📅</span> Choose date & time
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Appointment date</label>
              <input type="date" min="2026-06-25" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Preferred time of day</label>
              <select className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-teal-500">
                {["Morning (9 AM – 12 PM)","Afternoon (12 PM – 4 PM)","Evening (4 PM – 7 PM)"].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Available slots</label>
          <div className="flex flex-wrap gap-2 mb-6">
            {SLOTS.map(s => (
              <button key={s} onClick={() => setSelectedSlot(s)}
                className={`px-4 py-2 rounded-xl text-sm border transition-all ${selectedSlot === s ? "bg-teal-600 border-teal-600 text-white" : "bg-gray-50 border-gray-200 text-gray-700 hover:border-teal-400"}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">← Back</button>
            <button onClick={() => setStep(4)} className="flex-[2] py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors">Review & confirm →</button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold mb-5 flex items-center gap-2 text-gray-900">
            <span className="text-teal-600">✅</span> Confirm your appointment
          </h2>
          <div className="bg-teal-50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold ${doc?.color}`}>{doc?.initials}</div>
              <div>
                <div className="font-semibold text-gray-900">{doc?.name}</div>
                <div className="text-xs text-teal-700">{doc?.spec} · {doc?.dept}</div>
              </div>
            </div>
            <div className="border-t border-teal-200 pt-3 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500 text-xs">Date</span><br/><strong>Wed, 25 Jun 2026</strong></div>
              <div><span className="text-gray-500 text-xs">Time</span><br/><strong>{selectedSlot || "10:30 AM"}</strong></div>
              <div><span className="text-gray-500 text-xs">Type</span><br/><strong>Scheduled consultation</strong></div>
              <div><span className="text-gray-500 text-xs">Fee</span><br/><strong>₹{doc?.fee}</strong></div>
            </div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 mb-5 flex gap-2 items-start text-sm text-amber-700">
            <span>⚠️</span>
            Please arrive 10 minutes early with a valid photo ID. Bring all previous medical records.
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">← Edit</button>
            <button onClick={() => {
              toast.success("🎉 Appointment booked successfully! Check your queue status.", {
                duration: 6000,
              });
              onBooked();
            }} className="flex-[2] py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors">Confirm booking</button>
          </div>
        </div>
      )}
    </div>
  );
}
