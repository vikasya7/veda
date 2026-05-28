"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAssignmentStore } from "../../../store/assignmentStore";
import { useWebSocket } from "../../../hooks/useWebSocket";
import GenerationProgress from "../../../components/GenerationProgress";
import QuestionPaper from "../../../components/QuestionPaper";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function AssignmentOutputPage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params.id as string;

  const {
    generationStatus,
    generationProgress,
    generationMessage,
    generatedPaper,
    setGeneratedPaper,
    setGenerationState,
    setCurrentAssignmentId,
  } = useAssignmentStore();

  // Open WebSocket — listens for job.progress / job.complete / job.error
  useWebSocket(id);

  useEffect(() => {
    setCurrentAssignmentId(id);

    // Fetch assignment — handles page refresh (paper already done)
    fetch(`${API}/api/assignments/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        const a = d.data;

        if (a.status === "completed" && a.generatedPaper) {
          setGeneratedPaper({
            sections:       a.generatedPaper.sections,
            totalMarks:     a.totalQuestions * a.marksPerQuestion,
            totalQuestions: a.totalQuestions,
            metadata: {
              subject:     a.subject,
              grade:       a.grade,
              generatedAt: a.createdAt,
            },
          });
          setGenerationState({ status: "completed", progress: 100, message: "Paper ready!" });
        } else if (a.status === "failed") {
          setGenerationState({ status: "failed", message: a.errorMessage || "Generation failed" });
        } else {
          // queued or processing — WS events will update progress
          setGenerationState({ status: "processing", progress: 10, message: "Generating..." });
        }
      })
      .catch(console.error);
  }, [id]);

  const handleRegenerate = async () => {
    setGeneratedPaper(null);
    setGenerationState({ status: "queued", progress: 0, message: "Re-queuing..." });
    await fetch(`${API}/api/assignments/${id}/regenerate`, { method: "POST" });
  };

  // ── Show paper when done ────────────────────────────────────────────────────
  if (generationStatus === "completed" && generatedPaper) {
    return (
      <QuestionPaper
        paper={generatedPaper}
        assignmentId={id}
        onRegenerate={handleRegenerate}
      />
    );
  }

  // ── Show progress while generating ─────────────────────────────────────────
  return (
    <div className="page-content">
      <GenerationProgress
        progress={generationProgress}
        message={generationMessage}
        status={generationStatus}
      />
    </div>
  );
}