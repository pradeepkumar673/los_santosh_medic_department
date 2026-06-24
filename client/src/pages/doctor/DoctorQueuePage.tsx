// client/src/pages/doctor/DoctorQueuePage.tsx
import { useState, useCallback } from "react";
import { useRealtimeQueue } from "../../hooks/useRealtimeQueue";
import { useRealtimeAppointments } from "../../hooks/useRealtimeAppointments";
import { QueueUpdatedPayload, QueueEntry } from "../../services/socket.service";
import { useAuthStore } from "../../store/authStore";

export default function DoctorQueuePage() {
  const user = useAuthStore((s) => s.user);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [lastUpdated, setLastUpdated] = useState("");

  const onQueueUpdated = useCallback((payload: QueueUpdatedPayload) => {
    setQueue(payload.queue);
    setLastUpdated(new Date(payload.updatedAt).toLocaleTimeString());
  }, []);

  useRealtimeQueue({
    doctorId: user?.id,          // Doctor joins their own room
    onQueueUpdated,
    showCalledToast: true,
  });

  useRealtimeAppointments({ showToasts: true });

  const waiting    = queue.filter((e) => e.status === "waiting");
  const called     = queue.filter((e) => e.status === "called");
  const inProgress = queue.filter((e) => e.status === "in_progress");

  const PRIORITY_COLOR: Record<string, string> = {
    emergency: "bg-red-100 text-red-700 border-red-200",
    high:      "bg-orange-100 text-orange-700 border-orange-200",
    normal:    "bg-blue-100 text-blue-700 border-blue-200",
    low:       "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">My Live Queue</h1>
          <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            Real-time · updates without refresh
          </p>
        </div>
        {lastUpdated && (
          <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
            ↻ {lastUpdated}
          </span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Waiting",     count: waiting.length,    border: "border-amber-400"  },
          { label: "Called",      count: called.length,     border: "border-green-400"  },
          { label: "In Progress", count: inProgress.length, border: "border-blue-400"   },
        ].map(({ label, count, border }) => (
          <div key={label} className={`bg-white rounded-2xl border border-slate-100 border-l-4 ${border} p-4`}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-3xl font-black text-slate-800 mt-1">{count}</p>
          </div>
        ))}
      </div>

      {/* Now serving */}
      {inProgress.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Now Serving</h2>
          {inProgress.map((entry) => (
            <div key={entry._id} className="bg-blue-600 text-white rounded-2xl p-5 flex justify-between items-center">
              <div>
                <p className="text-xs opacity-70 mb-1">Token</p>
                <p className="text-5xl font-black leading-none">#{entry.tokenNumber}</p>
              </div>
              <span className="text-sm bg-blue-800 px-4 py-1.5 rounded-full font-medium">IN PROGRESS</span>
            </div>
          ))}
        </div>
      )}

      {/* Called */}
      {called.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Called</h2>
          <div className="flex gap-3 flex-wrap">
            {called.map((entry) => (
              <div key={entry._id} className="bg-green-100 border border-green-200 text-green-800 rounded-2xl px-6 py-3 text-2xl font-bold animate-pulse">
                #{entry.tokenNumber}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waiting list */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Waiting ({waiting.length})</h2>
        {waiting.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-3">🎉</div>
            <p className="text-sm">No patients waiting — queue is clear!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {waiting.map((entry) => (
              <div key={entry._id} className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center gap-4">
                <span className="text-lg font-bold text-slate-700 w-10">#{entry.tokenNumber}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${PRIORITY_COLOR[entry.priority]}`}>
                  {entry.priority.toUpperCase()}
                </span>
                <span className="flex-1 text-sm text-slate-500">Position {entry.positionInQueue}</span>
                <span className="text-sm text-slate-400">~{entry.estimatedWaitMinutes} min</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
