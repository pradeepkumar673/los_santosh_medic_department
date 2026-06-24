import { useState } from "react";

const QUEUE = [
  { pos: 1, label: "Patient #2401", status: "active", wait: "In consultation" },
  { pos: 2, label: "Patient #2402", status: "next", wait: "Next" },
  { pos: 3, label: "Patient #2403", status: "waiting", wait: "~10 min" },
  { pos: 4, label: "Rajesh Kumar (You)", status: "you", wait: "~18 min" },
  { pos: 5, label: "Patient #2405", status: "waiting", wait: "~23 min" },
  { pos: 6, label: "Patient #2406", status: "waiting", wait: "~28 min" },
];

export default function LiveQueuePage() {
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState("Just now");

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }, 800);
  };

  const statusStyle = (s: string) => {
    if (s === "active") return "bg-green-600 text-white";
    if (s === "next") return "bg-amber-500 text-white";
    if (s === "you") return "bg-teal-600 text-white";
    return "bg-gray-100 text-gray-500";
  };

  const badgeStyle = (s: string) => {
    if (s === "active") return "bg-green-100 text-green-700";
    if (s === "next") return "bg-amber-100 text-amber-700";
    if (s === "you") return "bg-teal-100 text-teal-700 font-semibold";
    return "bg-gray-100 text-gray-500";
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Live queue status</h1>
        <p className="text-sm text-gray-500 mt-1">Dr. Kavitha Ramesh · Cardiology OPD</p>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-teal-600 to-teal-500 rounded-2xl p-8 text-white text-center mb-6">
        <div className="flex items-center justify-center gap-2 text-sm opacity-75 mb-3">
          <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse inline-block" />
          Live · Updated {lastRefreshed}
        </div>
        <div className="text-8xl font-bold tracking-tight leading-none mb-2">04</div>
        <div className="text-sm opacity-80">Your position in queue</div>
        <div className="mt-4 text-sm opacity-70">Estimated wait: <strong className="opacity-100">~18 minutes</strong></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { val: "12", label: "Total in queue", color: "text-teal-600" },
          { val: "Now 1", label: "Currently serving", color: "text-green-600" },
          { val: "~5 min", label: "Avg per patient", color: "text-amber-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <div className={`text-xl font-semibold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* SMS Banner */}
      <div className="bg-green-50 rounded-xl border border-green-100 p-3.5 flex items-center gap-3 mb-6">
        <span className="text-2xl">📱</span>
        <div className="flex-1">
          <div className="text-sm font-medium text-green-800">SMS notifications enabled</div>
          <div className="text-xs text-green-600 mt-0.5">You'll be alerted when your turn is 2 positions away</div>
        </div>
        <button className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors bg-white">Edit</button>
      </div>

      {/* Queue list */}
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Queue status</h3>
      <div className="space-y-2">
        {QUEUE.map(q => (
          <div key={q.pos}
            className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-all ${
              q.status === "you"
                ? "bg-teal-50 border-teal-200"
                : "bg-white border-gray-100"
            }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${statusStyle(q.status)}`}>
              {q.pos}
            </div>
            <div className="flex-1 text-sm font-medium text-gray-800">{q.label}</div>
            <span className={`text-xs px-2.5 py-1 rounded-full ${badgeStyle(q.status)}`}>{q.wait}</span>
          </div>
        ))}
      </div>

      <button onClick={handleRefresh}
        className="mt-5 flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-50 transition-colors bg-white">
        <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh queue
      </button>
    </div>
  );
}
