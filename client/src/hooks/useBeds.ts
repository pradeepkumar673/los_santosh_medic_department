import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string;

export type BedOccupancy = {
  vacant: number;
  occupied: number;
  cleaning: number;
  maintenance: number;
};

export type BedStatusChangedPayload = {
  bed: Record<string, unknown>;
  departmentId: string;
  occupancy: BedOccupancy;
  action:
    | "allocated"
    | "discharged"
    | "status_changed"
    | "metadata_updated"
    | "created"
    | "deleted";
  patientId?: string;
  allocationId?: string;
  totalDays?: number;
  totalBillingAmount?: number;
  nextStatus?: string;
  updatedAt: string;
};

type UseBedOptions = {
  departmentId?: string;
  onBedStatusChanged?: (payload: BedStatusChangedPayload) => void;
};

export function useBeds({ departmentId, onBedStatusChanged }: UseBedOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [lastEvent, setLastEvent] = useState<BedStatusChangedPayload | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("[BedSocket] connected", socket.id);
      if (departmentId) socket.emit("join:department", departmentId);
      socket.emit("join:admin-dashboard");
    });

    socket.on("bed-status-changed", (payload: BedStatusChangedPayload) => {
      setLastEvent(payload);
      onBedStatusChanged?.(payload);
    });

    socket.on("connect_error", (err) => {
      console.error("[BedSocket] error:", err.message);
    });

    socketRef.current = socket;
  }, [departmentId, onBedStatusChanged]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  return { socket: socketRef.current, lastEvent };
}
