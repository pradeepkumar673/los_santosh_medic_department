import mongoose from "mongoose";
import { env } from "./env";

mongoose.set("strictQuery", true);

let isConnected = false;

export const connectDB = async (): Promise<void> => {
  if (isConnected) {
    console.log("⚡ MongoDB already connected");
    return;
  }

  try {
    mongoose.connection.on("connected", () => {
      isConnected = true;
      console.log(`✅ MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
    });

    mongoose.connection.on("disconnected", () => {
      isConnected = false;
      console.warn("⚠️  MongoDB disconnected");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err.message);
    });

    await mongoose.connect(env.MONGO_URI, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 10000,
      autoIndex: env.NODE_ENV !== "production", // build indexes in dev, skip in prod for perf
    });
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", (error as Error).message);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  isConnected = false;
  console.log("🔌 MongoDB connection closed");
};

export const getConnectionState = (): boolean => isConnected;
