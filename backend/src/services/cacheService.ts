import { redis } from "../config/redis";


const CACHE_TTL=60*60; // 1hour

export async function getCachedResult(id:string):Promise<object|null> {
    try {
        const raw=await redis.get(`assignment:result:${id}`);
        return raw? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
}

export async function setCachedResult(id: string, data: object): Promise<void> {
  try {
    // ioredis syntax: set key value EX seconds
    await redis.set(`assignment:result:${id}`, JSON.stringify(data), "EX", CACHE_TTL);
  } catch (err: any) {
    console.warn("[Cache] set failed:", err.message);
  }
}


export async function deleteCachedResult(id: string): Promise<void> {
  try {
    await redis.del(`assignment:result:${id}`);
  } catch {}
}