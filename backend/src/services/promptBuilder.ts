// src/services/promptBuilder.ts
import { IAssignment } from "../models/Assignment";

// ─── System prompt — locked to JSON output only ───────────────────────────────

export const SYSTEM_PROMPT = `You are an expert exam paper generator for schools and colleges.
Your job is to generate a structured question paper based on the teacher's specifications.

STRICT RULES:
1. Respond ONLY with a valid JSON object. No markdown, no code fences, no explanation.
2. Every question must have a unique "id" field: "q1", "q2", "q3" etc.
3. MCQ and true_false questions MUST include an "options" array.
   - MCQ: exactly 4 options
   - true_false: exactly 2 options ["True", "False"]
4. Short and long answer questions MUST have "options": null
5. Distribute difficulty EXACTLY as requested — count carefully.
6. Marks per question must be positive integers.
7. Group questions into sections by type:
   - Section A → MCQ / True-False  
   - Section B → Short answer
   - Section C → Long answer
   - If only one type exists, use a single section.
8. Each section needs a clear instruction line.

JSON Schema (follow exactly):
{
  "sections": [
    {
      "title": "Section A",
      "instruction": "Attempt all questions. Each question carries 1 mark.",
      "questions": [
        {
          "id": "q1",
          "text": "Question text here",
          "type": "mcq",
          "difficulty": "easy",
          "marks": 1,
          "options": ["Option A", "Option B", "Option C", "Option D"]
        }
      ]
    }
  ],
  "totalMarks": 30,
  "totalQuestions": 10,
  "metadata": {
    "subject": "Science",
    "grade": "Grade 8",
    "generatedAt": "2024-01-01T00:00:00.000Z"
  }
}`;

// ─── Main prompt builder ───────────────────────────────────────────────────────

export function buildUserPrompt(
  assignment: IAssignment,
  fileContext?: string
): string {
  const {
    title,
    subject,
    grade,
    totalQuestions,
    marksPerQuestion,
    questionTypes,
    difficultyDistribution,
    instructions,
  } = assignment;

  const { easy, medium, hard } = difficultyDistribution;
  const totalMarks = totalQuestions * marksPerQuestion;

  // ── Difficulty breakdown lines ─────────────────────────────────────────────
  const difficultyLines = [
    easy   > 0 ? `  - Easy:   ${easy} question(s)`   : null,
    medium > 0 ? `  - Medium: ${medium} question(s)` : null,
    hard   > 0 ? `  - Hard:   ${hard} question(s)`   : null,
  ]
    .filter(Boolean)
    .join("\n");

  // ── Section grouping hint ──────────────────────────────────────────────────
  const sectionHint = buildSectionHint(questionTypes);

  // ── Base prompt ───────────────────────────────────────────────────────────
  let prompt = `Generate a question paper with these exact specifications:

ASSIGNMENT DETAILS:
  Title:            ${title}
  Subject:          ${subject}
  Grade / Class:    ${grade}
  Total Questions:  ${totalQuestions}
  Marks/Question:   ${marksPerQuestion}
  Total Marks:      ${totalMarks}

QUESTION TYPES TO USE:
  ${questionTypes.join(", ")}

DIFFICULTY DISTRIBUTION (follow exactly):
${difficultyLines}

SECTION GROUPING:
${sectionHint}

ADDITIONAL INSTRUCTIONS FROM TEACHER:
  ${instructions || "None provided."}
`;

  // ── Append file context if uploaded ───────────────────────────────────────
  if (fileContext && fileContext.trim().length > 0) {
    prompt += `
CONTEXT FROM UPLOADED MATERIAL:
Use the following content to generate relevant, accurate questions.
Do not copy text verbatim — use it as the knowledge source.
---
${fileContext.slice(0, 3000)}
---`;
  }

  // ── Final reminder ────────────────────────────────────────────────────────
  prompt += `

REMINDER:
- Return ONLY valid JSON. No prose, no markdown fences.
- generatedAt must be: "${new Date().toISOString()}"
- totalMarks must be: ${totalMarks}
- totalQuestions must be: ${totalQuestions}
- Question ids must be sequential: q1, q2, q3...`;

  return prompt;
}

// ─── Correction prompt — used when LLM returns invalid JSON ──────────────────

export function buildCorrectionPrompt(
  previousResponse: string,
  errorMessage: string
): string {
  return `Your previous response failed validation with this error:
"${errorMessage}"

Your previous response was:
${previousResponse.slice(0, 800)}

Fix the JSON and return ONLY the corrected valid JSON object.
Do not include any explanation, apology, or markdown fences.
The JSON must exactly match the schema provided earlier.`;
}

// ─── Helper: build section grouping instructions ──────────────────────────────

function buildSectionHint(questionTypes: string[]): string {
  const hints: string[] = [];

  if (questionTypes.includes("mcq") || questionTypes.includes("true_false")) {
    hints.push("  - Section A → MCQ and/or True-False questions");
  }
  if (questionTypes.includes("short")) {
    hints.push("  - Section B → Short answer questions");
  }
  if (questionTypes.includes("long")) {
    hints.push("  - Section C → Long answer questions");
  }

  if (hints.length === 1) {
    return "  Use a single section since only one question type is requested.";
  }

  return hints.join("\n");
}