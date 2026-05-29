import { WebSocket,WebSocketServer } from "ws";
import { Server } from "http";
import { IncomingMessage } from "http";



export type WsEventType =
  | "connected"
  | "job.queued"
  | "job.progress"
  | "job.complete"
  | "job.error";


export interface WsPayload {
    event: WsEventType;
    assignmentId:string;
    message?:string;
    progress?:number;
    data?:unknown;
}

// room map assignment-->clientIds
// room map assignment --> clientIds
const rooms = new Map<string, Set<WebSocket>>();

// ✅ Cache last payload per room so late joiners get current state
const roomState = new Map<string, WsPayload>();

let wss: WebSocketServer;

// src/config/websocket.ts — add replay on connect

import { redis } from "../config/redis"; // add this import

export function initWebSocketServer(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    const url          = new URL(req.url || "", "http://localhost");
    const assignmentId = url.searchParams.get("assignmentId");

    if (!assignmentId) { ws.close(1008, "assignmentId required"); return; }

    if (!rooms.has(assignmentId)) rooms.set(assignmentId, new Set());
    rooms.get(assignmentId)!.add(ws);

    // ── Replay last known state to late joiner ──────────────────────────────
    try {
      const lastState = await redis.get(`ws:last:${assignmentId}`);
      if (lastState) {
        const payload = JSON.parse(lastState);
        console.log(`[WS] Replaying last state to late joiner: ${payload.event} ${payload.progress}`);
        safeSend(ws, payload);
      }
    } catch {}

    ws.on("close", () => {
      rooms.get(assignmentId)?.delete(ws);
      if (rooms.get(assignmentId)?.size === 0) rooms.delete(assignmentId);
    });

    ws.on("error", (err) => console.error(`[WS] Error:`, err.message));
    safeSend(ws, { event: "connected", assignmentId, message: "Listening..." });
  });

  return wss;
}

// broadcast to all clients in room
export function broadcast(assignmentId: string, payload: WsPayload): void {
  // ✅ Always cache latest state regardless of whether clients are connected
  roomState.set(assignmentId, payload);

  const room = rooms.get(assignmentId);

  if (!room || room.size === 0) {
    console.log(`[WS] No clients in room ${assignmentId}, state cached for late joiner`);
    return;
  }

  let sent = 0;
  for (const client of room) {
    if (client.readyState === WebSocket.OPEN) {
      safeSend(client, payload);
      sent++;
    }
  }
  console.log(
    `[WS] Broadcast to room ${assignmentId}: ${sent}/${room.size} clients | event: ${payload.event} | progress: ${payload.progress ?? "-"}`
  );
}

function safeSend(ws: WebSocket, payload: WsPayload): void {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  } catch (err: any) {
    console.error("[WS] safeSend failed:", err.message);
  }
}

// ─── Diagnostics ──────────────────────────────────────────────────────────────

export function getRoomSize(assignmentId: string): number {
  return rooms.get(assignmentId)?.size ?? 0;
}

export function getActiveRooms(): string[] {
  return Array.from(rooms.keys());
}
