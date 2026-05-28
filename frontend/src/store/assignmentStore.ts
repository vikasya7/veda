import { create } from "zustand";

export interface Question {
    id:string;
    text:string;
    type: "mcq" | "short" | "long" | "true_false";
    difficulty: "easy" | "medium" | "hard";
    marks:number;
    options?:string []|null
}


export interface Section {
  title: string;
  instruction: string;
  questions: Question[];
}

export interface GeneratedPaper {
  sections: Section[];
  totalMarks: number;
  totalQuestions: number;
  metadata: { subject: string; grade: string; generatedAt: string };
}

export interface Assignment {
  _id: string;
  title: string;
  subject: string;
  grade: string;
  status: "queued" | "processing" | "completed" | "failed";
  createdAt: string;
  dueDate?: string;
  generatedPaper?: { sections: Section[] };
  totalQuestions: number;
  marksPerQuestion: number;
}

export interface QuestionTypeRow {
  id: string;
  type: string;
  count: number;
  marks: number;
}


 
interface FormState {
  title: string;
  subject: string;
  grade: string;
  dueDate: string;
  questionTypes: QuestionTypeRow[];
  difficultyDistribution: { easy: number; medium: number; hard: number };
  instructions: string;
  file: File | null;
}


interface AssignmentStore {
    // list

    assignments: Assignment[];
    setAssignments:(a:Assignment[])=>void;
    addAssignment: (a: Assignment) => void;
    removeAssignment: (id: string) => void;


    // Form
  form: FormState;
  setForm: (f: Partial<FormState>) => void;
  resetForm: () => void;

  // Generation
  currentAssignmentId: string | null;
  setCurrentAssignmentId: (id: string | null) => void;
  generationProgress: number;
  generationMessage: string;
  generationStatus: "idle" | "queued" | "processing" | "completed" | "failed";
  setGenerationState: (s: Partial<{ progress: number; message: string; status: AssignmentStore["generationStatus"] }>) => void;

    // Output
  generatedPaper: GeneratedPaper | null;
  setGeneratedPaper: (p: GeneratedPaper | null) => void;
}


const defaultForm: FormState = {
  title: "",
  subject: "",
  grade: "",
  dueDate: "",
  questionTypes: [{ id: "1", type: "Multiple Choice Questions", count: 4, marks: 1 }],
  difficultyDistribution: { easy: 2, medium: 1, hard: 1 },
  instructions: "",
  file: null,
};

export const useAssignmentStore = create<AssignmentStore>((set) => ({
  assignments: [],
  setAssignments: (assignments) => set({ assignments }),
  addAssignment: (a) => set((s) => ({ assignments: [a, ...s.assignments] })),
  removeAssignment: (id) => set((s) => ({ assignments: s.assignments.filter((x) => x._id !== id) })),
 
  form: defaultForm,
  setForm: (f) => set((s) => ({ form: { ...s.form, ...f } })),
  resetForm: () => set({ form: defaultForm }),
 
  currentAssignmentId: null,
  setCurrentAssignmentId: (id) => set({ currentAssignmentId: id }),
  generationProgress: 0,
  generationMessage: "",
  generationStatus: "idle",
  setGenerationState: (s) =>
    set((prev) => ({
      generationProgress: s.progress ?? prev.generationProgress,
      generationMessage: s.message ?? prev.generationMessage,
      generationStatus: s.status ?? prev.generationStatus,
    })),
 
  generatedPaper: null,
  setGeneratedPaper: (p) => set({ generatedPaper: p }),
}));