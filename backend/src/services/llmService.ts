import OpenAI from "openai";
import { z } from "zod";

const QuestionSchema = z.object({
  id:         z.string().min(1),
  text:       z.string().min(5, "Question text too short"),
  type:       z.enum(["mcq", "short", "long", "true_false"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  marks:      z.number().int().min(1),
  options:    z.array(z.string()).nullable().optional(),
});

const SectionSchema = z.object({
  title:       z.string().min(1),
  instruction: z.string().min(1),
  questions:   z.array(QuestionSchema).min(1),
});

export const GeneratedPaperSchema = z.object({
  sections:       z.array(SectionSchema).min(1),
  totalMarks:     z.number().int().positive(),
  totalQuestions: z.number().int().positive(),
  metadata: z.object({
    subject:     z.string(),
    grade:       z.string(),
    generatedAt: z.string(),
  }),
});

export type GeneratedPaper = z.infer<typeof GeneratedPaperSchema>;

// ─── openai client — singleton ─────────────────────────────────────────────

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  
});

const MODEL      = "gpt-4o";           
const MAX_TOKENS = 4096;
const MAX_RETRIES = 3;

// ─── Strip accidental markdown fences from LLM output ─────────────────────────

function stripFences(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

// ─── Single LLM call ──────────────────────────────────────────────────────────

async function callLLM(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model:      MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: "system", content: systemPrompt },  // ← system goes in messages array
      { role: "user",   content: userPrompt   },
    ],
  });

  const content = response.choices[0].message.content;

  if (!content) {
    throw new Error("OpenAI returned empty content");
  }

  return content;
}

// ─── Parse + validate LLM output against Zod schema ──────────────────────────

function parseAndValidate(raw: string): GeneratedPaper {
  const cleaned = stripFences(raw);

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `LLM returned invalid JSON. First 200 chars: ${cleaned.slice(0, 200)}`
    );
  }

  // Zod validates shape, types, enums, and min values
  const result = GeneratedPaperSchema.safeParse(parsed);

  if (!result.success) {
    const firstError = result.error.issues[0];
    throw new Error(
      `Schema validation failed at "${firstError.path.join(".")}": ${firstError.message}`
    );
  }

  return result.data;
}

// ─── Main export — generates paper with retry logic ───────────────────────────

import { SYSTEM_PROMPT, buildCorrectionPrompt } from "./promptBuilder";

export async function generateQuestionPaper(
  userPrompt: string
): Promise<GeneratedPaper> {
  let lastRawResponse = "";
  let lastError       = "";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[LLM] Attempt ${attempt}/${MAX_RETRIES}`);

      // On retry use correction prompt, on first attempt use original
      const prompt =
        attempt === 1
          ? userPrompt
          : buildCorrectionPrompt(lastRawResponse, lastError);

      lastRawResponse = await callLLM(SYSTEM_PROMPT, prompt);

      const paper = parseAndValidate(lastRawResponse);

      console.log(
        `[LLM] Success — ${paper.totalQuestions} questions across ${paper.sections.length} sections`
      );

      return paper;

    } catch (err: any) {
      lastError = err.message || String(err);
      console.warn(`[LLM] Attempt ${attempt} failed: ${lastError}`);

      if (attempt === MAX_RETRIES) {
        throw new Error(
          `Question paper generation failed after ${MAX_RETRIES} attempts. Last error: ${lastError}`
        );
      }

      // Small delay before retry so we don't hammer the API
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  // TypeScript needs this even though the loop always returns or throws
  throw new Error("Unreachable");
}