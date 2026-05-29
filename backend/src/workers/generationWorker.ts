// src/workers/generationWorker.ts
import "dotenv/config";
import { Worker, Job } from "bullmq";
import { bullMQConnection, redis } from "../config/redis";
import { connectMongo } from "../config/mongo";
import Assignment from "../models/Assignment";
import { generateQuestionPaper } from "../services/llmService";
import { buildUserPrompt } from "../services/promptBuilder";
import { setCachedResult } from "../services/cacheService";
import { GENERATION_QUEUE, GenerationJobPayload } from "./queue";
import fs from "fs";
import path from "path";

// ── Publish to Redis instead of direct WS broadcast ───────────────────────────
async function publish(assignmentId: string, payload: object) {
  await redis.publish(
    "assignment:progress",
    JSON.stringify({ assignmentId, ...payload })
  );
}

async function extractFileText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".txt") return fs.readFileSync(filePath, "utf-8");
  if (ext === ".pdf") {
    const pdfParse = require("pdf-parse");
    const buffer   = fs.readFileSync(filePath);
    const data     = await pdfParse(buffer);
    return data.text as string;
  }
  return "";
}

async function processGenerationJob(job: Job<GenerationJobPayload>): Promise<void> {
  const { assignmentId, uploadedFileUrl } = job.data;

  console.log(`[Worker] Processing job ${job.id} for assignment ${assignmentId}`);

  // Step 1
  await Assignment.findByIdAndUpdate(assignmentId, { status: "processing", jobId: job.id });
  await publish(assignmentId, { event: "job.progress", message: "Starting generation...", progress: 10 });
  await job.updateProgress(10);

  // Step 2
  const assignment = await Assignment.findById(assignmentId).lean();
  if (!assignment) throw new Error(`Assignment ${assignmentId} not found`);

  // Step 3
  let fileContext: string | undefined;
  if (uploadedFileUrl) {
    try {
      fileContext = await extractFileText(uploadedFileUrl);
    } catch (err: any) {
      console.warn("[Worker] File extraction failed:", err.message);
    }
  }

  await publish(assignmentId, { event: "job.progress", message: "Building prompt...", progress: 25 });
  await job.updateProgress(25);

  // Step 4
  const userPrompt = buildUserPrompt(assignment as any, fileContext);

  await publish(assignmentId, { event: "job.progress", message: "AI is generating questions...", progress: 40 });
  await job.updateProgress(40);

  // Step 5 — LLM call
  const paper = await generateQuestionPaper(userPrompt);

  await publish(assignmentId, { event: "job.progress", message: "Validating output...", progress: 75 });
  await job.updateProgress(75);

  // Step 6 — Save
  await Assignment.findByIdAndUpdate(assignmentId, {
    status:         "completed",
    generatedPaper: { sections: paper.sections },
    errorMessage:   undefined,
  });

  // Step 7 — Cache
  await setCachedResult(assignmentId, paper);

  await publish(assignmentId, { event: "job.progress", message: "Saving paper...", progress: 90 });
  await job.updateProgress(90);

  // Step 8 — Done
  await publish(assignmentId, {
    event:    "job.complete",
    message:  "Your question paper is ready!",
    progress: 100,
    data:     paper,
  });
  await job.updateProgress(100);

  console.log(`[Worker] Job ${job.id} completed for assignment ${assignmentId}`);
}

async function startWorker(): Promise<void> {
  await connectMongo();
  console.log("[Worker] Connected to MongoDB");

  const worker = new Worker<GenerationJobPayload>(
    GENERATION_QUEUE,
    processGenerationJob,
    { connection: bullMQConnection, concurrency: 3 }
  );

  worker.on("completed", (job) => {
    console.log(`[Worker] ✓ Job ${job.id} completed`);
  });

  worker.on("failed", async (job, err) => {
    console.error(`[Worker] ✗ Job ${job?.id} failed:`, err.message);
    if (!job?.data.assignmentId) return;

    const { assignmentId } = job.data;
    await Assignment.findByIdAndUpdate(assignmentId, {
      status:       "failed",
      errorMessage: err.message,
    }).catch(() => {});

    await publish(assignmentId, {
      event:   "job.error",
      message: `Generation failed: ${err.message}`,
    }).catch(() => {});
  });

  worker.on("error", (err) => console.error("[Worker] Error:", err.message));

  console.log(`[Worker] Listening on queue: ${GENERATION_QUEUE}`);

  process.on("SIGTERM", async () => { await worker.close(); process.exit(0); });
  process.on("SIGINT",  async () => { await worker.close(); process.exit(0); });
}

startWorker().catch((err) => {
  console.error("[Worker] Fatal error:", err);
  process.exit(1);
});

