import { Router } from "express";
import mongoose from "mongoose";
import { redis } from "../config/redis";

const router = Router();

router.get("/", async (_, res) => {
  const mongoState =
    mongoose.connection.readyState === 1
      ? "connected"
      : "disconnected";

  const redisState = redis.status;

  res.json({
    success: true,
    services: {
      mongodb: mongoState,
      redis: redisState
    }
  });
});

export default router;