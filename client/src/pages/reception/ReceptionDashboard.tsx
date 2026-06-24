// client/src/pages/reception/ReceptionDashboard.tsx
import { useState, useCallback } from "react";
import { useRealtimeQueue } from "../../hooks/useRealtimeQueue";
import { useRealtimeBeds } from "../../hooks/useRealtimeBeds";
import { useRealtimeAppointments } from "../../hooks/useRealtimeAppointments";
import { QueueUpdatedPayload, QueueEntry } from "../../services/socket.service";

export default function ReceptionDashboard() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);

  const onQueueUpdated = useCallback((payload: QueueUpdatedPayload) => {
    setQueue(payload.queue);
  }, []);

  // All three real-time channels active simultaneously
  useRealtimeQueue({ onQueueUpdated, showCalledToast: true });
  useRealtimeBeds({ showToasts: true });
  useRealtimeAppointments({ showToasts: true });

  const stats = {
    waiting: queue.filter((e) => e.status === "waiting").length,
    inProgress: queue.filter((e) => e.status === "in_progress").length,
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Reception Dashboard</h1>
      <p className="text-sm text-slate-400 mb-8 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
        Live — Queue, beds &amp; appointments update automatically
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Waiting",     val: stats.waiting,    color: "text-indigo-600" },
          { label: "In Progress", val: stats.inProgress, color: "text-green-600"  },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className={`text-4xl font-black mt-1 ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
