import {z} from 'zod'

export const QUESTION_TYPES = ['mcq', 'short', 'long', 'true_false'] as const;
export const DIFFICULTIES   = ['easy', 'medium', 'hard'] as const;

export const QuestionTypeEnum=z.enum(QUESTION_TYPES)
export const DifficultyEnum   = z.enum(DIFFICULTIES);

const titleField = z
  .string()
  .min(3, "Title must be at least 3 characters")
  .max(150, "Title must be under 150 characters")
  .trim();

const subjectField = z
   .string()
   .min(1,"Grade is required")
   .max(20,'Grade value too long')
   .trim()


const gradeField = z
  .string()
  .min(1,  'Grade is required')
  .max(20,  'Grade value too long')
  .trim();


const questionTypesField=z
    .array(QuestionTypeEnum)
    .min(1,'Select at least 1 question type')
    .refine(
        (arr)=>new Set(arr).size===arr.length,
        'Duplicates not allowed'
    )

const difficultyDistributionField = z.object({
  easy:   z.number().int().min(0, 'Cannot be negative'),
  medium: z.number().int().min(0, 'Cannot be negative'),
  hard:   z.number().int().min(0, 'Cannot be negative'),
});


const marksPerQuestionField = z
  .number()
  .int('Marks must be a whole number')
  .min(1,  'Marks must be at least 1')
  .max(100, 'Marks per question cannot exceed 100');

const totalQuestionsField = z
  .number()
  .int('Must be a whole number')
  .min(1,  'At least 1 question required')
  .max(50,  'Maximum 50 questions allowed');


export const CreateAssignmentSchema= z
  .object({
    title:titleField,
    subject:subjectField,
    grade:gradeField,
    dueDate:z.string().datetime({ offset: true }).optional(),
    questionTypes:questionTypesField,
    totalQuestions:         totalQuestionsField,
    marksPerQuestion:       marksPerQuestionField,
    difficultyDistribution: difficultyDistributionField,
    instructions:           z.string().max(1000, 'Instructions too long').optional(),
  })

  .refine(
    (data) =>{
        const {easy,medium,hard}=data.difficultyDistribution
        return easy + medium + hard===data.totalQuestions
    },
    {
        message: 'easy + medium + hard must equal total questions',
        path: ['difficultyDistribution'],
    }
  )
   // ── Cross-field rule 2: at least one difficulty level must be non-zero 
  .refine(
    (data) => {
      const { easy, medium, hard } = data.difficultyDistribution;
      return easy + medium + hard > 0;
    },
    {
      message: 'At least one difficulty level must have questions',
      path: ['difficultyDistribution'],
    }
  )
  // ── Cross-field rule 3: total marks sanity check ───────────────────────────
  .refine(
    (data) => data.marksPerQuestion * data.totalQuestions <= 500,
    {
      message: 'Total marks (marksPerQuestion × totalQuestions) cannot exceed 500',
      path: ['marksPerQuestion'],
    }
  );

export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;


// generate paper schema

export const GeneratedQuestionSchema=z.object({
    id:z.string().min(1),
    text:z.string().min(5,'Question text too short'),
    type:QuestionTypeEnum,
    difficulty:DifficultyEnum,
    marks: z.number,
    options:z.array(z.string()).length(4).nullable().optional()
});


export const GeneratedSectionSchema=z.object({
    title:z.string().min(1),
    instruction:z.string().min(1),
    questions:z.array(GeneratedQuestionSchema).min(1)
})


export const GeneratedPaperSchema=z.object({
    sections:z.array(GeneratedSectionSchema),
    totalMarks:z.number().int().positive(),
    totalQuestions:z.number().int().positive(),
    metadata: z.object({
      subject:     z.string(),
      grade:       z.string(),
      generatedAt: z.string(),
    }),
})


export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;
export type GeneratedSection  = z.infer<typeof GeneratedSectionSchema>;
export type GeneratedPaper    = z.infer<typeof GeneratedPaperSchema>;


// ─── WebSocket event payloads ─────────────────────────────────────────────────

export interface WsEvent {
  event:        'job.queued' | 'job.progress' | 'job.complete' | 'job.error';
  assignmentId: string;
  message?:     string;
  progress?:    number;
  data?:        GeneratedPaper;
}

// ─── BullMQ job payload ───────────────────────────────────────────────────────

export interface GenerationJobPayload {
  assignmentId: string;
  filePath?:    string;
}