import { Request, Response, NextFunction } from "express";
import Assignment from "../models/Assignment";
import { getGenerationQueue } from "../workers/queue";


export const createAssignment=async(
    req:Request,res:Response,next:NextFunction
):Promise<void> =>{
    try {
        const uploadedFileUrl=req.file?.path;
        const assignment=await Assignment.create({
            ...req.body,
            uploadedFileUrl,
            status:"queued"
        })
        const assignmentId=assignment._id.toString()
        
        //enque the generation job
        const queue=getGenerationQueue();
        await queue.add(
            "generate",
            {assignmentId,uploadedFileUrl},
            {jobId:assignmentId}
        );

        res.status(201).json({
            success:true,
            message: "Assignment created and generation queued",
            data:{
                assignmentId,
                status:assignment.status,
                wsEndpoint: `/ws?assignmentId=${assignmentId}`,
            }
        })
    } catch (error) {
        next(error)
    }
}


export const getAssignment=async(
    req:Request<{id:string}>,
    res:Response,
    next:NextFunction
):Promise<void> =>{
    try {
        const assignment=await Assignment.findById(req.params.id).lean()

        if (!assignment) {
          res.status(404).json({ success: false, message: "Assignment not found" });
          return;
       }

        res.json({ success: true, data: assignment });
    } catch (error) {
        next(error)
    }
}


export const regenerateAssignment=async (
    req:Request<{id:string}>,
    res:Response,
    next:NextFunction
):Promise<void>=>{
    try {
        const assignment = await Assignment.findById(req.params.id);

        if (!assignment) {
           res.status(404).json({ success: false, message: "Assignment not found" });
          return;
        }

        if (assignment.status === "processing") {
           res.status(409).json({
           success: false,
           message: "Generation already in progress",
         });
         return;
        }

        // reset state before requeue

        assignment.status="queued"
        assignment.generatedPaper=undefined
        assignment.errorMessage=undefined
        await assignment.save()

        const assignmentId=assignment._id.toString()
        const queue=getGenerationQueue()
        await queue.add(
            "generate",
            {assignmentId,uploadedFileUrl:assignment.uploadedFileUrl},
            { jobId: `${assignmentId}-regen-${Date.now()}` }
        )
        
        res.json({
          success: true,
          message: "Regeneration queued",
          data: {
            assignmentId,
            wsEndpoint: `/ws?assignmentId=${assignmentId}`,
           },
        });
    } catch (error) {
        next(error)
    }
}

export const getAssignments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(20, Number(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [assignments, total] = await Promise.all([
      Assignment.find({}, { generatedPaper: 0 }) // exclude heavy field
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Assignment.countDocuments(),
    ]);

    res.json({
      success: true,
      data: assignments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};