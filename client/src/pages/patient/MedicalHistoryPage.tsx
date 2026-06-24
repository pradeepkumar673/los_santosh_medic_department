const TIMELINE = [
  {
    date: "12 Jun 2026", doctor: "Dr. Kavitha Ramesh", dept: "Cardiology",
    title: "Cardiac check-up & ECG review",
    detail: "BP 138/88 mmHg. ECG within normal limits. Advised lifestyle modifications and medication review.",
    rx: ["Amlodipine 5mg", "Aspirin 75mg", "Losartan 50mg"],
    icon: "❤️",
  },
  {
    date: "28 Apr 2026", doctor: "Dr. Priya Nair", dept: "General Medicine",
    title: "HbA1c review & diabetes management",
    detail: "HbA1c: 7.2% (improved from 8.1%). Metformin dose adjusted. Next review in 3 months. Dietitian referral given.",
    rx: ["Metformin 1000mg", "Glimepiride 2mg"],
    icon: "🩸",
  },
  {
    date: "5 Mar 2026", doctor: "Dr. Arun Mehta", dept: "Orthopedics",
    title: "Right knee pain evaluation",
    detail: "X-ray showed mild osteoarthritis Grade I-II. Physiotherapy recommended for 4 weeks. Weight reduction advised.",
    rx: ["Diclofenac 50mg (10 days)", "Calcium 500mg"],
    icon: "🦴",
  },
  {
    date: "19 Jan 2026", doctor: "Dr. Priya Nair", dept: "General Medicine",
    title: "Viral fever & throat infection",
    detail: "Temp 101.4°F. Throat culture negative. Symptomatic treatment given. Complete resolution in 5 days.",
    rx: ["Paracetamol 500mg", "Cetirizine 10mg"],
    icon: "🦠",
  },
];

export default function MedicalHistoryPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Medical history</h1>
          <p className="text-sm text-gray-500 mt-1">Your visits, diagnoses & prescriptions</p>
        </div>
        <button className="text-sm border border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export PDF
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { val: "14", label: "Total visits", color: "text-teal-600" },
          { val: "3", label: "Active Rx", color: "text-blue-600" },
          { val: "2", label: "Chronic conditions", color: "text-amber-600" },
          { val: "B+", label: "Blood group", color: "text-green-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
            <div className={`text-xl font-semibold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-gray-500 mt-0.5 leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Conditions & Allergies */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Chronic conditions</div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700">Type 2 Diabetes</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Hypertension</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Allergies</div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700">Penicillin</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700">Sulfa drugs</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Visit timeline</h3>
      <div className="relative">
        <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200" />
        <div className="space-y-4">
          {TIMELINE.map((item, i) => (
            <div key={i} className="flex gap-4 relative">
              <div className="w-7 h-7 rounded-full bg-teal-50 border-2 border-teal-500 flex items-center justify-center text-sm flex-shrink-0 z-10">
                {item.icon}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 flex-1">
                <div className="text-xs text-gray-400 mb-1">{item.date} · {item.doctor} · {item.dept}</div>
                <div className="font-semibold text-sm text-gray-900 mb-2">{item.title}</div>
                <p className="text-sm text-gray-500 leading-relaxed mb-3">{item.detail}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {item.rx.map(r => (
                    <span key={r} className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">{r}</span>
                  ))}
                </div>
                <button className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
                  📄 View prescription
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mt-6">
        <button className="text-sm text-gray-500 border border-gray-200 rounded-xl px-5 py-2 hover:bg-gray-50 transition-colors">
          Load older records
        </button>
      </div>
    </div>
  );
}
