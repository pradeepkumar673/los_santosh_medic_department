// client/src/services/socket.service.ts
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/authStore";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string;

export interface QueueUpdatedPayload {
  doctorId: string;
  departmentId: string;
  queue: QueueEntry[];
  updatedAt: string;
}

export interface QueueEntry {
  _id: string;
  tokenNumber: number;
  patient: { _id: string; user: string };
  status: "waiting" | "called" | "in_progress" | "completed" | "skipped" | "cancelled";
  priority: "emergency" | "high" | "normal" | "low";
  positionInQueue: number;
  estimatedWaitMinutes: number;
  checkedInAt: string;
  calledAt?: string;
}

export interface NewAppointmentPayload {
  appointmentId: string;
  patientName?: string;
  doctorId: string;
  departmentId: string;
  scheduledAt?: string;
  appointmentType?: string;
  [key: string]: unknown;
}

export interface PatientStatusChangedPayload {
  appointmentId: string;
  patientName?: string;
  status: string;
  tokenNumber?: number;
  [key: string]: unknown;
}

export interface BedStatusChangedPayload {
  bed: {
    _id: string;
    bedNumber: string;
    ward: string;
    floor: number;
    bedType: string;
    status: "vacant" | "occupied" | "cleaning" | "maintenance";
    pricePerDay: number;
    currentPatient?: { user?: { name?: string; phone?: string } };
    department?: { name: string };
    assignedAt?: string;
    expectedDischargeDate?: string;
  };
  departmentId: string;
  occupancy: {
    vacant: number;
    occupied: number;
    cleaning: number;
    maintenance: number;
  };
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
}

export interface ServerToClientEvents {
  "queue-updated": (payload: QueueUpdatedPayload) => void;
  "new-appointment": (payload: NewAppointmentPayload) => void;
  "patient-status-changed": (payload: PatientStatusChangedPayload) => void;
  "bed-status-changed": (payload: BedStatusChangedPayload) => void;
}

type EventHandler<E extends keyof ServerToClientEvents> = ServerToClientEvents[E];

class SocketService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<Function>>();

  connect(): Socket {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on("connect", () => {
      console.log("[Socket] connected:", this.socket?.id);
      this.autoJoinRoomsForRole();
      // Re-register any existing listeners after reconnect
      this.listeners.forEach((handlers, event) => {
        handlers.forEach((handler) => {
          this.socket?.on(event, handler as any);
        });
      });
    });

    this.socket.on("connect_error", (err) =>
      console.error("[Socket] error:", err.message)
    );
    this.socket.on("disconnect", (reason) =>
      console.warn("[Socket] disconnected:", reason)
    );

    return this.socket;
  }

  private autoJoinRoomsForRole() {
    const { user } = useAuthStore.getState();
    if (!user || !this.socket) return;

    if (user.role === "admin" || user.role === "reception") {
      this.socket.emit("join:admin-dashboard");
    }
    if (user.role === "patient") {
      this.socket.emit("join:my-queue", user.id);
    }
  }

  joinDoctorQueue(doctorId: string) {
    this.socket?.emit("join:doctor-live", doctorId);
  }
  leaveDoctorQueue(doctorId: string) {
    this.socket?.emit("leave:doctor-queue", doctorId);
  }
  joinDepartment(departmentId: string) {
    this.socket?.emit("join:department", departmentId);
  }
  leaveDepartment(departmentId: string) {
    this.socket?.emit("leave:department", departmentId);
  }
  joinPatientQueue(patientId: string) {
    this.socket?.emit("join:my-queue", patientId);
  }
  joinAdminDashboard() {
    this.socket?.emit("join:admin-dashboard");
  }

  on<E extends keyof ServerToClientEvents>(event: E, handler: EventHandler<E>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    this.socket?.on(event, handler as any);
  }

  off<E extends keyof ServerToClientEvents>(event: E, handler: EventHandler<E>) {
    this.listeners.get(event)?.delete(handler);
    this.socket?.off(event, handler as any);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.listeners.clear();
  }

  get isConnected() {
    return this.socket?.connected ?? false;
  }

  get instance() {
    return this.socket;
  }
}

export const socketService = new SocketService();
