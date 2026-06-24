import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { env } from "./env";

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    role: string;
  };
}

interface AccessTokenPayload {
  id: string;
  role: string;
}

let io: SocketIOServer;

/**
 * Room naming conventions:
 *  - `doctor:<doctorId>`       -> updates specific to a doctor's live queue
 *  - `department:<deptId>`     -> department-wide queue/board updates
 *  - `patient:<patientId>`     -> personal notifications (turn approaching, etc.)
 *  - `user:<userId>`           -> generic per-user channel (any role)
 *  - `admin-dashboard`         -> global stats for admin/reception screens
 */
export const ROOMS = {
  doctor: (doctorId: string) => `doctor:${doctorId}`,
  department: (deptId: string) => `department:${deptId}`,
  patient: (patientId: string) => `patient:${patientId}`,
  user: (userId: string) => `user:${userId}`,
  adminDashboard: "admin-dashboard",
};

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // Authenticate socket connections using the same JWT access token cookie as REST API
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie;
      if (!rawCookie) {
        return next(new Error("Authentication error: no cookies provided"));
      }

      const parsedCookies = cookie.parse(rawCookie);
      const token = parsedCookies["accessToken"];

      if (!token) {
        return next(new Error("Authentication error: access token missing"));
      }

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
      socket.user = { id: decoded.id, role: decoded.role };
      next();
    } catch (err) {
      next(new Error("Authentication error: invalid or expired token"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(`🔌 Socket connected: ${socket.id} (user: ${socket.user?.id}, role: ${socket.user?.role})`);

    // Every authenticated user auto-joins their personal room
    if (socket.user) {
      socket.join(ROOMS.user(socket.user.id));
    }

    // Client explicitly joins context-specific rooms after connecting
    socket.on("join:doctor-queue", (doctorId: string) => {
      socket.join(ROOMS.doctor(doctorId));
    });

    socket.on("leave:doctor-queue", (doctorId: string) => {
      socket.leave(ROOMS.doctor(doctorId));
    });

    socket.on("join:department", (deptId: string) => {
      socket.join(ROOMS.department(deptId));
    });

    socket.on("leave:department", (deptId: string) => {
      socket.leave(ROOMS.department(deptId));
    });

    socket.on("join:patient-updates", (patientId: string) => {
      // Only allow joining your own patient room (or staff roles)
      if (
        socket.user?.id === patientId ||
        ["doctor", "nurse", "reception", "admin"].includes(socket.user?.role || "")
      ) {
        socket.join(ROOMS.patient(patientId));
      }
    });

    socket.on("join:admin-dashboard", () => {
      if (["admin", "reception"].includes(socket.user?.role || "")) {
        socket.join(ROOMS.adminDashboard);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.io not initialized. Call initSocket() first.");
  }
  return io;
};
