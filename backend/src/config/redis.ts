import Redis from "ioredis";

export const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

redis.on("connect",()=>{
    console.log("Redis Connected");
})

redis.on("error",(err)=>{
    console.error("❌ Redis Error:", err);
})


//BULLMQ usues same connection


export const bullMQConnection = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

export async function connectRedis():Promise<void> {
    await redis.ping()
    console.log("[Redis] Ping successful");
}