import mongoose, {Schema,HydratedDocument} from "mongoose";

export const QUESTION_TYPES = ["mcq", "short", "long", "true_false"] as const;
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const STATUSES = ["queued", "processing", "completed", "failed"] as const;

export type QuestionType = typeof QUESTION_TYPES[number];
export type Difficulty = typeof DIFFICULTIES[number];
export type Status = typeof STATUSES[number];


export interface IQuestion {
    id:string,
    text:string,
    type:QuestionType,
    difficulty:Difficulty,
    marks:number,
    options?:string[] | null
}

export interface ISection {
    title:string,
    instruction:string,
    questions:IQuestion[];
}

export interface IAssignment {
    title:string;
    subject:string;
    grade:string;
    dueDate?: Date; 
    questionTypes:QuestionType[];
    totalQuestions:number;
    marksPerQuestion:number;
    difficultyDistribution: {        
     easy: number;
     medium: number;
     hard: number;
    };
    instructions?:string;
    uploadedFileUrl:string;
    status:Status,
    jobId?:string,
    errorMessage?: string;           // ← added: debug failed jobs
    generatedPaper?: {
     sections: ISection[];
    };
    createdAt: Date;
    updatedAt: Date;
}

// now we will create schemas

const QuestionSchema=new Schema<IQuestion>(
    {
        id: {type:String,required:true},
        text: {type:String,required:true},
        type:{type:String,enum:QUESTION_TYPES,required:true},
        difficulty: { type: String, enum: DIFFICULTIES, required: true },
        marks: { type: Number, required: true, min: 1 },   
        options:{type:[String],default:null}
    },
    { _id: false }
);

const SectionSchema=new Schema<ISection>(
    {
        title:{type:String,required:true},
        instruction:{type:String,required:true},
        questions:[QuestionSchema]
    },
    { _id: false }
);

const AssignmentSchema=new Schema<IAssignment>(
    {
        title:{type:String,required:true,trim:true},
        subject:{type:String,required:true,trim:true},
        grade:{type:String,required:true,trim:true},
        dueDate:{type:Date},
        questionTypes:{type:[String],enum:QUESTION_TYPES,required:true},
        totalQuestions: { type: Number, required: true, min: 1, max: 50 },
        marksPerQuestion: { type: Number, required: true, min: 1 },   // ← min added
        difficultyDistribution: {                                      // ← added
          easy:   { type: Number, default: 0, min: 0 },
          medium: { type: Number, default: 0, min: 0 },
          hard:   { type: Number, default: 0, min: 0 },
        },
        instructions: { type: String, maxlength: 1000 },
        uploadedFileUrl: { type: String },
        status: { type: String, enum: STATUSES, default: "queued" },
        jobId: { type: String },                                       // ← added
        errorMessage: { type: String },   
        generatedPaper:{
            sections:[SectionSchema],
        },   
    },
    {
        timestamps:true,
        toJSON:{virtuals:true},
        toObject:{virtuals:true}
    }
);

AssignmentSchema.index({ status: 1, createdAt: -1 });

export type AssignmentDocument=HydratedDocument<IAssignment>

export default mongoose.model<IAssignment>("Assignment",AssignmentSchema)

