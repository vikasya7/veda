import "dotenv/config"
import { Worker,Job } from "bullmq"
import { bullMQConnection } from "../config/redis"
import { connectMongo } from "../config/mongo"
import Assignment from "../models/Assignment"
import { generateQuestionPaper } from "../services/llmService"
import { buildUserPrompt } from "../services/promptBuilder"
import { setCachedResult } from "../services/cacheService"
import { broadcast } from "../config/websocket"
import { GENERATION_QUEUE,GenerationJobPayload } from "./queue"
import fs from "fs"
import path from "path"


// file text extractor

async function extractFileText(filePath:string):Promise<string> {
    const ext=path.extname(filePath).toLowerCase()
    if(ext===".txt"){
        return fs.readFileSync(filePath,"utf-8")
    }

    if(ext===".pdf"){
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfParse=require("pdf-parse")
        const buffer=fs.readFileSync(filePath)
        const data=pdfParse(buffer)
        return data.text as string
    }
    return "";
}

// core job

async function processGenerationJob(job:Job<GenerationJobPayload>):Promise<void> {
    const {assignmentId,uploadedFileUrl}=job.data

    console.log(`[Worker] processing job ${job.id} for assignment ${assignmentId}`)

    // step-1 mark as processing and notify the client
    await Assignment.findByIdAndUpdate(assignmentId,{
        status:"processing",
        jobId:job.id
    })

    broadcast(assignmentId,{
        event:"job.progress",
        assignmentId,
        message:"starting generation",
        progress:10,
    });
    await job.updateProgress(10);
    

    //step-2 load assignment from mongodb
    const assignment=await Assignment.findById(assignmentId).lean()
    if (!assignment) {
       throw new Error(`Assignment ${assignmentId} not found`);
    }

    // step-3 extract file content
    let fileContext: string | undefined

     if(uploadedFileUrl){
        try {
      fileContext = await extractFileText(uploadedFileUrl);
      console.log(
        `[Worker] Extracted ${fileContext.length} chars from uploaded file`
      );
      } catch (err: any) {
      // Non-fatal — proceed without file context
       console.warn("[Worker] File extraction failed:", err.message);
      }
     }
      broadcast(assignmentId,{
        event:"job.progress",
        assignmentId,
        message:      "Building prompt...",
        progress:     25,
      })
      await job.updateProgress(25);
    // step-4 build structureed prompt

    const userPrompt=buildUserPrompt(assignment as any,fileContext)
    broadcast(assignmentId, {
    event:        "job.progress",
    assignmentId,
    message:      "Generating questions with AI...",
    progress:     40,
     });

     await job.updateProgress(40);


    // ── Step 5: Call LLM — retries handled inside generateQuestionPaper ────────
    const paper = await generateQuestionPaper(userPrompt);
    broadcast(assignmentId, {
    event:        "job.progress",
    assignmentId,
    message:      "Validating generated paper...",
    progress:     75,
     });

     await job.updateProgress(75);


     // ── Step 6: Persist result to MongoDB ─────────────────────────────────────
  await Assignment.findByIdAndUpdate(assignmentId, {
    status:         "completed",
    generatedPaper: { sections: paper.sections },
    errorMessage:   undefined,
  });

  // ── Step 7: Cache result in Redis (1h TTL) ─────────────────────────────────
  await setCachedResult(assignmentId, paper);

  broadcast(assignmentId, {
    event:        "job.progress",
    assignmentId,
    message:      "Saving your paper...",
    progress:     90,
  });


   await job.updateProgress(90);

  // ── Step 8: Notify frontend — generation complete ──────────────────────────
  broadcast(assignmentId, {
    event:        "job.complete",
    assignmentId,
    message:      "Your question paper is ready!",
    progress:     100,
    data:         paper,
  });

  await job.updateProgress(100);

  console.log(`[Worker] Job ${job.id} completed for assignment ${assignmentId}`);
}



// worker - job

async function startWorker():Promise<void> {
    // worker is a seprate process need its own mongosb connection

    await connectMongo();

    console.log("[Worker] Connected to MongoDB");

    const worker=new Worker<GenerationJobPayload>(
        GENERATION_QUEUE,
        processGenerationJob,
        {
           connection:bullMQConnection,
           concurrency:3. // upto 3 jobs simultanously
        }
    )

    worker.on("completed", (job) => {
       console.log(`[Worker] ✓ Job ${job.id} completed`);
    });

    worker.on("failed", async (job, err) => {
    console.error(`[Worker] ✗ Job ${job?.id} failed:`, err.message);

    if (!job?.data.assignmentId) return;

    const { assignmentId } = job.data;

    // Persist failure state to MongoDB
    await Assignment.findByIdAndUpdate(assignmentId, {
      status:       "failed",
      errorMessage: err.message,
    }).catch((e) =>
      console.error("[Worker] Failed to update assignment status:", e.message)
    );

    // Notify frontend
    broadcast(assignmentId, {
      event:        "job.error",
      assignmentId,
      message:      `Generation failed: ${err.message}`,
    });
  });

  worker.on("error", (err) => {
    console.error("[Worker] Worker-level error:", err.message);
  });

  worker.on("stalled", (jobId) => {
    console.warn(`[Worker] Job ${jobId} stalled — will be retried`);
  });


  console.log(`[Worker] Listening on queue: ${GENERATION_QUEUE}`);
  console.log("[Worker] Concurrency: 3");

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  async function shutdown(signal: string): Promise<void> {
    console.log(`\n[Worker] ${signal} received — shutting down gracefully...`);

    await worker.close(); // finish current jobs, reject new ones
    console.log("[Worker] Shutdown complete");
    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
}

startWorker().catch((err) => {
  console.error("[Worker] Fatal error on startup:", err);
  process.exit(1);
});

