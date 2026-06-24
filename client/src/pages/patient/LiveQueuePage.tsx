// client/src/pages/patient/LiveQueuePage.tsx
import { useState, useCallback } from "react";
import { useRealtimeQueue } from "../../hooks/useRealtimeQueue";
import { useAuthStore } from "../../store/authStore";
import { QueueUpdatedPayload, QueueEntry } from "../../services/socket.service";

// YOUR_PATIENT_TOKEN - in production derive this from the active appointment
const MY_TOKEN = 4;

export default function LiveQueuePage() {
  const user = useAuthStore((s) => s.user);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState("just now");

  const onQueueUpdated = useCallback((payload: QueueUpdatedPayload) => {
    setQueue(payload.queue);
    setLastRefreshed(new Date(payload.updatedAt).toLocaleTimeString());
  }, []);

  // ← Socket subscribed; toasts fire automatically on MY token's turn
  useRealtimeQueue({
    patientId: user?.id,
    onQueueUpdated,
    myTokenNumber: MY_TOKEN,
  });

  const myEntry = queue.find((e) => e.tokenNumber === MY_TOKEN);
  const inProgress = queue.find((e) => e.status === "in_progress");
  const waiting = queue.filter((e) => e.status === "waiting");

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
          Live queue status
        </h1>
        <p className="text-sm text-gray-500 mt-1">Updated {lastRefreshed}</p>
      </div>

      <div className="bg-gradient-to-br from-teal-600 to-teal-500 rounded-2xl p-8 text-white text-center mb-6">
        <div className="text-8xl font-bold tracking-tight leading-none mb-2">
          {myEntry ? String(myEntry.positionInQueue).padStart(2, "0") : "--"}
        </div>
        <div className="text-sm opacity-80">Your position in queue</div>
        {myEntry && (
          <div className="mt-4 text-sm opacity-70">
            Estimated wait: <strong className="opacity-100">~{myEntry.estimatedWaitMinutes} min</strong>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { val: String(waiting.length), label: "Total waiting", color: "text-teal-600" },
          { val: inProgress ? `#${inProgress.tokenNumber}` : "—", label: "Currently serving", color: "text-green-600" },
          { val: "~5 min", label: "Avg per patient", color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <div className={`text-xl font-semibold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Queue</h3>
      <div className="space-y-2">
        {waiting.slice(0, 8).map((entry) => (
          <div
            key={entry._id}
            className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-all ${
              entry.tokenNumber === MY_TOKEN
                ? "bg-teal-50 border-teal-200"
                : "bg-white border-gray-100"
            }`}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold bg-gray-100 text-gray-700 flex-shrink-0">
              {entry.positionInQueue}
            </div>
            <div className="flex-1 text-sm font-medium text-gray-800">
              Token #{entry.tokenNumber}
              {entry.tokenNumber === MY_TOKEN && (
                <span className="ml-2 text-teal-600 text-xs font-semibold">← You</span>
              )}
            </div>
            <span className="text-xs text-gray-400">~{entry.estimatedWaitMinutes} min</span>
          </div>
        ))}
      </div>
    </div>
  );
}
