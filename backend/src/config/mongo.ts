
import mongoose from "mongoose";

export const connectMongo=async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI!)
        console.log("mongo db connected")
    } catch (error) {
        console.error(" MongoDB Connection Failed");
        process.exit(1);
    }
}