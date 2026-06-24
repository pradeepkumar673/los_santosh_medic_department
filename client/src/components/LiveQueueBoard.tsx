// client/src/components/LiveQueueBoard.tsx
import { useState, useCallback } from "react";
import { useRealtimeQueue } from "../hooks/useRealtimeQueue";
import { QueueUpdatedPayload, QueueEntry } from "../services/socket.service";

const PRIORITY_COLOR: Record<string, string> = {
  emergency: "bg-red-600 text-white",
  high: "bg-orange-400 text-white",
  normal: "bg-blue-500 text-white",
  low: "bg-gray-400 text-white",
};

type Props = { doctorId: string; departmentId: string };

export default function LiveQueueBoard({ doctorId, departmentId }: Props) {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const onQueueUpdated = useCallback((payload: QueueUpdatedPayload) => {
    setQueue(payload.queue);
    setLastUpdated(new Date(payload.updatedAt).toLocaleTimeString());
  }, []);

  useRealtimeQueue({
    doctorId,
    departmentId,
    onQueueUpdated,
    showCalledToast: true,  // ← toasts fire when a token is called/in-progress
  });

  const waiting    = queue.filter((e) => e.status === "waiting");
  const called     = queue.filter((e) => e.status === "called");
  const inProgress = queue.filter((e) => e.status === "in_progress");

  return (
    <div className="bg-gray-900 min-h-screen p-6 text-white font-sans">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Queue</h1>
          <p className="text-xs text-gray-500 mt-0.5">Updates in real-time via WebSocket</p>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-400 bg-gray-800 px-3 py-1.5 rounded-full">
            ↻ {lastUpdated}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Waiting",     count: waiting.length,    color: "border-yellow-500" },
          { label: "Called",      count: called.length,     color: "border-green-500" },
          { label: "In Progress", count: inProgress.length, color: "border-blue-500" },
        ].map(({ label, count, color }) => (
          <div key={label} className={`bg-gray-800 rounded-xl p-4 border-l-4 ${color}`}>
            <p className="text-gray-400 text-sm">{label}</p>
            <p className="text-3xl font-bold">{count}</p>
          </div>
        ))}
      </div>

      {inProgress.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-2">Now Serving</h2>
          {inProgress.map((entry) => (
            <div key={entry._id} className="bg-blue-700 rounded-xl p-4 flex justify-between items-center">
              <span className="text-4xl font-black">#{entry.tokenNumber}</span>
              <span className="text-sm bg-blue-900 px-3 py-1 rounded-full">IN PROGRESS</span>
            </div>
          ))}
        </div>
      )}

      {called.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-2">Called</h2>
          <div className="flex gap-3 flex-wrap">
            {called.map((entry) => (
              <div key={entry._id} className="bg-green-700 rounded-xl px-5 py-3 text-2xl font-bold animate-pulse">
                #{entry.tokenNumber}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-3">Waiting Queue</h2>
        {waiting.length === 0 ? (
          <p className="text-gray-500 text-sm">No patients waiting.</p>
        ) : (
          <div className="space-y-2">
            {waiting.map((entry) => (
              <div key={entry._id} className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-4">
                <span className="text-xl font-bold w-10">#{entry.tokenNumber}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PRIORITY_COLOR[entry.priority]}`}>
                  {entry.priority.toUpperCase()}
                </span>
                <span className="flex-1 text-sm text-gray-300">Position {entry.positionInQueue}</span>
                <span className="text-sm text-gray-400">~{entry.estimatedWaitMinutes} min</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
