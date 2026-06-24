import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string;

export type QueueEntry = {
  _id: string;
  tokenNumber: number;
  patient: { _id: string; user: string };
  status: "waiting" | "called" | "in_progress" | "completed" | "skipped" | "cancelled";
  priority: "emergency" | "high" | "normal" | "low";
  positionInQueue: number;
  estimatedWaitMinutes: number;
  checkedInAt: string;
  calledAt?: string;
};

export type QueuePayload = {
  doctorId: string;
  departmentId: string;
  queue: QueueEntry[];
  updatedAt: string;
};

type UseQueueOptions = {
  doctorId?: string;
  departmentId?: string;
  patientId?: string;
  onQueueUpdated?: (payload: QueuePayload) => void;
  onNewAppointment?: (data: unknown) => void;
  onPatientStatusChanged?: (data: unknown) => void;
  onBedStatusChanged?: (data: unknown) => void;
};

export function useQueue({
  doctorId,
  departmentId,
  patientId,
  onQueueUpdated,
  onNewAppointment,
  onPatientStatusChanged,
  onBedStatusChanged,
}: UseQueueOptions) {
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true, // sends accessToken cookie
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("[Socket] connected", socket.id);

      // Join relevant rooms
      if (doctorId) socket.emit("join:doctor-live", doctorId);
      if (departmentId) socket.emit("join:department", departmentId);
      if (patientId) socket.emit("join:my-queue", patientId);
      socket.emit("join:admin-dashboard");
    });

    socket.on("queue-updated", (payload: QueuePayload) => {
      onQueueUpdated?.(payload);
    });

    socket.on("new-appointment", (data: unknown) => {
      onNewAppointment?.(data);
    });

    socket.on("patient-status-changed", (data: unknown) => {
      onPatientStatusChanged?.(data);
    });

    socket.on("bed-status-changed", (data: unknown) => {
      onBedStatusChanged?.(data);
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] connection error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] disconnected:", reason);
    });

    socketRef.current = socket;
  }, [doctorId, departmentId, patientId, onQueueUpdated, onNewAppointment, onPatientStatusChanged, onBedStatusChanged]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  return { socket: socketRef.current };
}
