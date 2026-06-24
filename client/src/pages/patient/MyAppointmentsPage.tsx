import { useState } from "react";

const APPOINTMENTS = [
  { id: 1, doc: "Dr. Kavitha Ramesh", dept: "Cardiology", day: "25", month: "JUN", time: "10:30 AM", type: "Consultation", status: "upcoming", fee: 600 },
  { id: 2, doc: "Dr. Priya Nair", dept: "General Medicine", day: "18", month: "JUL", time: "2:00 PM", type: "Follow-up", status: "upcoming", fee: 350 },
  { id: 3, doc: "Dr. Arun Mehta", dept: "Orthopedics", day: "12", month: "JUN", time: "11:00 AM", type: "Review", status: "completed", fee: 500 },
  { id: 4, doc: "Dr. Anitha Sharma", dept: "Dermatology", day: "30", month: "MAY", time: "4:30 PM", type: "Consultation", status: "completed", fee: 400 },
  { id: 5, doc: "Dr. Suresh Kumar", dept: "Pediatrics", day: "20", month: "APR", time: "9:00 AM", type: "Vaccination", status: "cancelled", fee: 450 },
];

const FILTERS = ["all", "upcoming", "completed", "cancelled"] as const;
type Filter = typeof FILTERS[number];

const statusBadge = (s: string) => {
  if (s === "upcoming") return <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">⏰ Upcoming</span>;
  if (s === "completed") return <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">✓ Completed</span>;
  return <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Cancelled</span>;
};

export default function MyAppointmentsPage({ onBook }: { onBook: () => void }) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = APPOINTMENTS.filter(a => filter === "all" || a.status === filter);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My appointments</h1>
          <p className="text-sm text-gray-500 mt-1">Upcoming and past visits</p>
        </div>
        <button onClick={onBook} className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          + Book new
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm border capitalize transition-all ${
              filter === f ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-teal-300"
            }`}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📅</div>
          <p className="text-sm">No appointments in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4">
              {/* Date box */}
              <div className="bg-teal-50 rounded-xl px-3.5 py-2.5 text-center flex-shrink-0">
                <div className="text-2xl font-bold text-teal-700 leading-none">{a.day}</div>
                <div className="text-xs text-teal-600 uppercase tracking-wide mt-0.5">{a.month}</div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm">{a.doc}</div>
                <div className="mt-1">{statusBadge(a.status)}</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                  <span>🏥 {a.dept}</span>
                  <span>🕐 {a.time}</span>
                  <span>🩺 {a.type}</span>
                  <span>₹{a.fee}</span>
                </div>
                {a.status === "upcoming" && (
                  <div className="flex gap-2 mt-3">
                    <button className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">Reschedule</button>
                    <button className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Cancel</button>
                  </div>
                )}
                {a.status === "completed" && (
                  <div className="flex gap-2 mt-3">
                    <button className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">View summary</button>
                    <button className="text-xs px-3 py-1.5 rounded-lg border border-teal-200 text-teal-600 hover:bg-teal-50 transition-colors">Book follow-up</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
