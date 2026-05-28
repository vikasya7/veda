import { useEffect, useRef, useCallback } from "react";
import { useAssignmentStore } from "../store/assignmentStore";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5001";

export function useWebSocket(assignmentId: string | null) {
  const ws = useRef<WebSocket | null>(null);
  const { setGenerationState, setGeneratedPaper } = useAssignmentStore();

  const connect = useCallback(() => {
    if (!assignmentId) return;

    ws.current = new WebSocket(`${WS_BASE}?assignmentId=${assignmentId}`);

    ws.current.onopen = () => {
      console.log("[WS] Connected to room:", assignmentId);
    };

    ws.current.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        switch (msg.event) {
          case "job.progress":
            setGenerationState({
              progress: msg.progress,
              message: msg.message,
              status: "processing",
            });
            break;

          case "job.complete":
            setGenerationState({ progress: 100, message: "Paper ready!", status: "completed" });
            if (msg.data) setGeneratedPaper(msg.data);
            ws.current?.close();
            break;

          case "job.error":
            setGenerationState({ message: msg.message, status: "failed" });
            ws.current?.close();
            break;
        }
      } catch (err) {
        console.error("[WS] Parse error:", err);
      }
    };

    ws.current.onerror = () => {
      setGenerationState({ status: "failed", message: "Connection error" });
    };

    ws.current.onclose = () => {
      console.log("[WS] Disconnected");
    };
  }, [assignmentId, setGenerationState, setGeneratedPaper]);

  useEffect(() => {
    connect();
    return () => ws.current?.close();
  }, [connect]);
}