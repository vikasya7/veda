import { useEffect, useRef, useCallback } from "react";
import { useAssignmentStore } from "../store/assignmentStore";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5001/ws";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
const POLL_INTERVAL = 3000;

export function useWebSocket(assignmentId: string | null) {
  const ws = useRef<WebSocket | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCompleted = useRef(false);
  const isUnmounted = useRef(false);
  const connectRef = useRef<() => void>(() => {}); // ✅ ref to avoid circular dep

  const { setGenerationState, setGeneratedPaper } = useAssignmentStore();

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (!assignmentId || pollTimer.current) return;
    console.log("[WS] Falling back to polling...");

    setGenerationState({ status: "processing", message: "Connecting...", progress: 0 });

    pollTimer.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/assignments/${assignmentId}/status`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === "completed" && data.paper) {
          isCompleted.current = true;
          stopPolling();
          setGenerationState({ progress: 100, message: "Paper ready!", status: "completed" });
          setGeneratedPaper(data.paper);
        } else if (data.status === "failed") {
          stopPolling();
          setGenerationState({ status: "failed", message: data.message || "Generation failed. Please try again." });
        } else {
          setGenerationState({ status: "processing", message: data.message || "AI generating...", progress: data.progress ?? 0 });
        }
      } catch (err) {
        console.error("[Poll] Error:", err);
      }
    }, POLL_INTERVAL);
  }, [assignmentId, setGenerationState, setGeneratedPaper, stopPolling]);

  const connect = useCallback(() => {
    if (!assignmentId) return;
    if (isUnmounted.current) return;

    if (
      ws.current &&
      (ws.current.readyState === WebSocket.OPEN ||
        ws.current.readyState === WebSocket.CONNECTING)
    ) return;

    console.log("[WS] Attempting connection...");
    ws.current = new WebSocket(`${WS_BASE}?assignmentId=${assignmentId}`);

    ws.current.onopen = () => {
      if (isUnmounted.current) {
        ws.current?.close();
        return;
      }
      console.log("[WS] Connected to room:", assignmentId);
      stopPolling();
    };

    ws.current.onmessage = (e) => {
      if (isUnmounted.current) return;
      try {
        const msg = JSON.parse(e.data);
        switch (msg.event) {
          case "job.progress":
            setGenerationState({ progress: msg.progress, message: msg.message, status: "processing" });
            break;
          case "job.complete":
            isCompleted.current = true;
            stopPolling();
            setGenerationState({ progress: 100, message: "Paper ready!", status: "completed" });
            if (msg.data) setGeneratedPaper(msg.data);
            ws.current?.close();
            break;
          case "job.error":
            stopPolling();
            setGenerationState({ message: msg.message, status: "failed" });
            ws.current?.close();
            break;
        }
      } catch (err) {
        console.error("[WS] Parse error:", err);
      }
    };

    ws.current.onerror = () => {
      if (isUnmounted.current) return;
      console.warn("[WS] Connection error — retrying in 2s");
      if (!isCompleted.current) {
        retryTimer.current = setTimeout(() => {
          if (!isUnmounted.current && !isCompleted.current) {
            ws.current = null;
            connectRef.current(); // ✅ use ref instead of connect directly
          }
        }, 2000);
      }
    };

    ws.current.onclose = (e) => {
      console.log("[WS] Disconnected — code:", e.code, "reason:", e.reason, "wasClean:", e.wasClean);
      if (!isCompleted.current && !isUnmounted.current) {
        startPolling();
      }
    };
  }, [assignmentId, setGenerationState, setGeneratedPaper, startPolling, stopPolling]);

  // ✅ Keep ref in sync with latest connect
  // eslint-disable-next-line react-hooks/refs
  connectRef.current = connect;

  useEffect(() => {
    isUnmounted.current = false;
    isCompleted.current = false;

    retryTimer.current = setTimeout(() => connect(), 300);

    return () => {
      isUnmounted.current = true;
      isCompleted.current = false;
      stopPolling();
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (
        ws.current &&
        (ws.current.readyState === WebSocket.OPEN ||
          ws.current.readyState === WebSocket.CONNECTING)
      ) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [connect, stopPolling]);
}