import http from "http";
import app from "./app";
import { env } from "./config/env";
import { connectDB, disconnectDB } from "./config/db";
import { initSocket } from "./config/socket";

const httpServer = http.createServer(app);

// Initialize Socket.io on top of the same HTTP server as Express
const io = initSocket(httpServer);

// Make io accessible inside Express request handlers via req.app.get("io")
app.set("io", io);

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    httpServer.listen(env.PORT, () => {
      console.log(`🚀 MediQueue AI server running on port ${env.PORT} [${env.NODE_ENV}]`);
      console.log(`🩺 Health check: http://localhost:${env.PORT}/health`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// ---------- Graceful shutdown ----------
const shutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);

  io.close(() => {
    console.log("🔌 Socket.io connections closed");
  });

  httpServer.close(async () => {
    console.log("🌐 HTTP server closed");
    await disconnectDB();
    process.exit(0);
  });

  // Force-exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error("⏱️  Forcing shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  process.exit(1);
});

startServer();
