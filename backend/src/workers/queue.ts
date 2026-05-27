import { Queue } from "bullmq";
import { bullMQConnection } from "../config/redis";

export interface GenerationJobPayload {
    assignmentId:string;
    uploadedFileUrl?:string;
}

export const GENERATION_QUEUE = "assessment-generation";

let queue: Queue<GenerationJobPayload>;

export function getGenerationQueue():Queue<GenerationJobPayload> {
    if(!queue){
        queue=new Queue<GenerationJobPayload>(GENERATION_QUEUE,{
            connection:bullMQConnection,
            defaultJobOptions:{
                attempts:1,
                removeOnComplete:50,
                removeOnFail:100,
                backoff:{
                    type:"exponential",
                    delay:2000,
                }
            }
        })
         queue.on("error", (err) => {
            console.error("[Queue] BullMQ queue error:", err.message);
         });
    }
    return queue
}