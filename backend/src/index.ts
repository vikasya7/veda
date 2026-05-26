import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { connectMongo } from "./config/mongo";
dotenv.config();
import "./config/redis";

import healthRoutes from "./routes/health";

import { errorHandler } from "./middleware/errorHandler";



const app = express();

app.use(cors());

app.use(express.json());

app.use("/api/health", healthRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectMongo();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();
