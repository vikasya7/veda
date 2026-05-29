import "dotenv/config";
import http from "http";
import express, { Application } from "express";
import cors from "cors";
import { connectMongo } from "./config/mongo";
import { connectRedis, redis } from "./config/redis";  
import { initWebSocketServer } from "./config/websocket";
import assignmentRoutes from "./routes/assignments";
import { errorHandler } from "./middleware/errorHandler";

import Redis from "ioredis";
import { broadcast } from "./config/websocket";
const PORT=Number(process.env.PORT) || 4000;

// express app

const app:Application=express()

app.use(cors({ origin: "*", methods: ["GET", "POST", "DELETE", "OPTIONS"] }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// routes

app.use("/api/assignments", assignmentRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(errorHandler);


const subscriber = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

subscriber.subscribe("assignment:progress", (err) => {
  if (err) console.error("[Redis Sub] Subscribe error:", err);
  else console.log("[Redis Sub] Subscribed to assignment:progress");
});

subscriber.on("message", async (_channel, message) => {
  try {
    const payload = JSON.parse(message);
    const { assignmentId, ...rest } = payload;

    // ── Save last state so late joiners can catch up ──────────────────────
    await redis.set(
      `ws:last:${assignmentId}`,
      JSON.stringify({ assignmentId, ...rest }),
      "EX", 3600  // expire after 1 hour
    );

    broadcast(assignmentId, { assignmentId, ...rest });
  } catch (err) {
    console.error("[Redis Sub] Error:", err);
  }
});


// bootstrap

async function bootstrap():Promise<void> {
   // connect to mongodb
   // 1. Connect to MongoDB
  await connectMongo();
  console.log("[Server] MongoDB connected");

  // 2. Connect to Redis
  await connectRedis();
  console.log("[Server] Redis connected");

  // 3. Create HTTP server from Express app
  //    WebSocket shares the same port as HTTP
  const server = http.createServer(app);

  // 4. Attach WebSocket server to HTTP server
  initWebSocketServer(server)

   // 5. Start listening
  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║       AI Assessment Creator — Backend        ║
╠══════════════════════════════════════════════╣
║  HTTP    →  http://localhost:${PORT}             ║
║  WS      →  ws://localhost:${PORT}/ws            ║
║  Health  →  http://localhost:${PORT}/api/health  ║
╚══════════════════════════════════════════════╝
    `);
    });

    async function shutdown(signal: string): Promise<void> {
  console.log(`\n[Server] ${signal} received — shutting down...`);

  server.close(() => {
    console.log("[Server] HTTP server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("[Server] Fatal startup error:", err);
  process.exit(1);
});

