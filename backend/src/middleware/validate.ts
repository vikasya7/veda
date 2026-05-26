
import {Request,Response,NextFunction} from "express"
import { ZodSchema,ZodError } from "zod"

export const validate= 
   (schema:ZodSchema)=>
    async (req:Request,res:Response,next:NextFunction):Promise<void> =>{
        try {
            req.body=await schema.parseAsync(req.body)
            next()
        } catch (error) {
            if(error instanceof ZodError){
                res.status(400).json({
                    success:false,
                    errors:error.issues.map((e)=>({
                        field:e.path.join('.'),
                        message:e.message
                    }))
                })
                return
            }
            next(error)
        }
    }