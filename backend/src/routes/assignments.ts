import { Router } from "express";
import { createAssignment, getAssignment, regenerateAssignment } from "../controllers/assignmentController";
import { upload } from "../middleware/upload";
import { validate } from "../middleware/validate";
import { CreateAssignmentSchema } from "../types";



const router=Router()

router.get(
    "/",
    getAssignment
)


router.post(
    "/",
    upload.single("file"),
    validate(CreateAssignmentSchema),
    createAssignment
)

router.get(
    "/:id",
    getAssignment
)

router.post(
    "/:id/regenerate",
    regenerateAssignment
)

export default router

