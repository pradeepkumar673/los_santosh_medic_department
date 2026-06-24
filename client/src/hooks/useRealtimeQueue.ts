// client/src/hooks/useRealtimeQueue.ts
import { useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { socketService, QueueUpdatedPayload, QueueEntry } from "../services/socket.service";

interface UseRealtimeQueueOptions {
  doctorId?: string;
  departmentId?: string;
  patientId?: string;
  /** Called every time the queue snapshot changes */
  onQueueUpdated?: (payload: QueueUpdatedPayload) => void;
  /** Show toast when a patient is called to the room */
  showCalledToast?: boolean;
  /** Show toast when MY turn comes (patient view) */
  myTokenNumber?: number;
}

export function useRealtimeQueue({
  doctorId,
  departmentId,
  patientId,
  onQueueUpdated,
  showCalledToast = false,
  myTokenNumber,
}: UseRealtimeQueueOptions) {
  const prevQueueRef = useRef<QueueEntry[]>([]);

  const handleQueueUpdated = useCallback(
    (payload: QueueUpdatedPayload) => {
      const prev = prevQueueRef.current;
      const curr = payload.queue;

      // Detect newly-called patients and fire toasts
      if (showCalledToast) {
        curr.forEach((entry) => {
          const wasWaiting = prev.find(
            (p) => p._id === entry._id && p.status === "waiting"
          );
          if (wasWaiting && entry.status === "called") {
            toast(`🔔 Token #${entry.tokenNumber} — called to room`, {
              duration: 5000,
              style: { background: "#1E40AF", color: "#fff", fontWeight: 600 },
            });
          }
          if (wasWaiting && entry.status === "in_progress") {
            toast.success(`✅ Token #${entry.tokenNumber} is now in consultation`, {
              duration: 4000,
            });
          }
        });
      }

      // Patient-view: alert when it's MY turn
      if (myTokenNumber != null) {
        const myEntry = curr.find((e) => e.tokenNumber === myTokenNumber);
        const myPrev = prev.find((e) => e.tokenNumber === myTokenNumber);
        if (myEntry && myPrev) {
          if (myPrev.status === "waiting" && myEntry.status === "called") {
            toast(`🏥 It's your turn! Token #${myTokenNumber} — please proceed`, {
              duration: 10000,
              icon: "🔔",
              style: { background: "#065F46", color: "#fff", fontWeight: 700, fontSize: 15 },
            });
          }
          if (myEntry.positionInQueue === 2 && myPrev.positionInQueue > 2) {
            toast(`⏳ You're next! 2 patients ahead`, {
              duration: 6000,
              style: { background: "#92400E", color: "#fff", fontWeight: 600 },
            });
          }
        }
      }

      prevQueueRef.current = curr;
      onQueueUpdated?.(payload);
    },
    [onQueueUpdated, showCalledToast, myTokenNumber]
  );

  useEffect(() => {
    // Join rooms
    if (doctorId) socketService.joinDoctorQueue(doctorId);
    if (departmentId) socketService.joinDepartment(departmentId);
    if (patientId) socketService.joinPatientQueue(patientId);

    socketService.on("queue-updated", handleQueueUpdated);

    return () => {
      socketService.off("queue-updated", handleQueueUpdated);
      if (doctorId) socketService.leaveDoctorQueue(doctorId);
      if (departmentId) socketService.leaveDepartment(departmentId);
    };
  }, [doctorId, departmentId, patientId, handleQueueUpdated]);
}
