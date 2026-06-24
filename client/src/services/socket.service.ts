import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/authStore";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string;

export interface QueueUpdatedPayload {
  doctorId: string;
  departmentId: string;
  queue: unknown[];
  updatedAt: string;
}
export interface NewAppointmentPayload {
  appointmentId: string;
  doctorId: string;
  departmentId: string;
  [key: string]: unknown;
}
export interface PatientStatusChangedPayload {
  appointmentId: string;
  status: string;
  [key: string]: unknown;
}
export interface BedStatusChangedPayload {
  bed: Record<string, unknown>;
  departmentId: string;
  occupancy: Record<string, number>;
  action: string;
  updatedAt: string;
}

export interface ServerToClientEvents {
  "queue-updated": (payload: QueueUpdatedPayload) => void;
  "new-appointment": (payload: NewAppointmentPayload) => void;
  "patient-status-changed": (payload: PatientStatusChangedPayload) => void;
  "bed-status-changed": (payload: BedStatusChangedPayload) => void;
}

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SOCKET_URL, {
      withCredentials: true, // sends the httpOnly accessToken cookie — matches socket.ts auth
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on("connect", () => {
      console.log("[Socket] connected:", this.socket?.id);
      this.autoJoinRoomsForRole();
    });
    this.socket.on("connect_error", (err) => console.error("[Socket] error:", err.message));
    this.socket.on("disconnect", (reason) => console.warn("[Socket] disconnected:", reason));

    return this.socket;
  }

  /** Joins the rooms relevant to the logged-in user's role automatically. */
  private autoJoinRoomsForRole() {
    const { user } = useAuthStore.getState();
    if (!user || !this.socket) return;

    if (user.role === "admin" || user.role === "reception") {
      this.socket.emit("join:admin-dashboard");
    }
    if (user.role === "patient") {
      this.socket.emit("join:my-queue", user.id);
    }
    // Doctor/department rooms are page-specific (which doctor/dept you're
    // viewing), so those screens call joinDoctorQueue()/joinDepartment() themselves.
  }

  joinDoctorQueue(doctorId: string) {
    this.socket?.emit("join:doctor-queue", doctorId);
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

  on<E extends keyof ServerToClientEvents>(event: E, handler: ServerToClientEvents[E]) {
    this.socket?.on(event, handler as any);
  }
  off<E extends keyof ServerToClientEvents>(event: E, handler: ServerToClientEvents[E]) {
    this.socket?.off(event, handler as any);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  get instance() {
    return this.socket;
  }
}

export const socketService = new SocketService();
