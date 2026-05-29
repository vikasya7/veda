"use client";
import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useAssignmentStore } from "../../../store/assignmentStore";
import { useWebSocket } from "../../../hooks/useWebSocket";
import GenerationProgress from "../../../components/GenerationProgress";
import QuestionPaper from "../../../components/QuestionPaper";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const POLL_INTERVAL = 2000; // poll every 2s as fallback

export default function AssignmentOutputPage() {
  const params = useParams();
  const id     = params.id as string;
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const {
    generationStatus,
    generationProgress,
    generationMessage,
    generatedPaper,
    setGeneratedPaper,
    setGenerationState,
    setCurrentAssignmentId,
  } = useAssignmentStore();

  // WebSocket — works if frontend connects before job finishes
  useWebSocket(id);

  // ── Fetch assignment status ──────────────────────────────────────────────────
  const fetchAssignment = async () => {
    try {
      const res  = await fetch(`${API}/api/assignments/${id}`);
      const data = await res.json();
      if (!data.success) return;

      const a = data.data;

      if (a.status === "completed" && a.generatedPaper) {
        // ✅ Already done — set immediately, stop polling
        stopPolling();
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
        setGenerationState({
          status:   "completed",
          progress: 100,
          message:  "Paper ready!",
        });
      } else if (a.status === "failed") {
        stopPolling();
        setGenerationState({
          status:  "failed",
          message: a.errorMessage || "Generation failed",
        });
      }
      // if still queued/processing — keep polling, WS will also update
    } catch (err) {
      console.error("[Page] Fetch error:", err);
    }
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    setCurrentAssignmentId(id);

    // Immediate fetch — catches already-completed jobs
    fetchAssignment();

    // Polling fallback — catches the case where WS missed the event
    pollRef.current = setInterval(fetchAssignment, POLL_INTERVAL);

    return () => stopPolling();
  }, [id]);

  // Stop polling once WS delivers completion
  useEffect(() => {
    if (generationStatus === "completed" || generationStatus === "failed") {
      stopPolling();
    }
  }, [generationStatus]);

  const handleRegenerate = async () => {
    setGeneratedPaper(null);
    setGenerationState({ status: "queued", progress: 0, message: "Re-queuing..." });
    await fetch(`${API}/api/assignments/${id}/regenerate`, { method: "POST" });
    // Restart polling
    pollRef.current = setInterval(fetchAssignment, POLL_INTERVAL);
  };

  if (generationStatus === "completed" && generatedPaper) {
    return (
      <QuestionPaper
        paper={generatedPaper}
        assignmentId={id}
        onRegenerate={handleRegenerate}
      />
    );
  }

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