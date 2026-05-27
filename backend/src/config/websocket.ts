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
const rooms=new Map<string,Set<WebSocket>>();
let wss:WebSocketServer;

export function initWebSocketServer(server:Server):WebSocketServer {
     wss=new WebSocketServer({server,path:"/ws"});
     wss.on("connection",(ws:WebSocket,req:IncomingMessage)=>{
        // client connects
       const url = new URL(req.url || "", "http://localhost");
       const assignmentId=url.searchParams.get("assignmentId")


       if(!assignmentId){
         ws.close(1008, "assignmentId query param required");
         return;
       }
       // join room
       if(!rooms.has(assignmentId)){
         rooms.set(assignmentId,new Set())
       }
       rooms.get(assignmentId)!.add(ws)

        console.log(
      `[WS] Client joined room: ${assignmentId} | room size: ${rooms.get(assignmentId)!.size}`
        );

        safeSend(ws,{
            event:"connected",
            assignmentId,
            message: "Listening for updates...",
        })
        // leave room on disconnect
        ws.on("close",()=>{
            rooms.get(assignmentId)?.delete(ws);

            // clean up empty rooms
            if(rooms.get(assignmentId)?.size===0){
                rooms.delete(assignmentId)
            }
            console.log(`[WS] Client left room: ${assignmentId}`);
        })
        ws.on("error", (err) => {
          console.error(`[WS] Socket error in room ${assignmentId}:`, err.message);
       });

      

    })
     wss.on("error", (err) => {
          console.error("[WS] Server error:", err.message);
    });
    console.log("[WS] WebSocket server initialized on path /ws");
    return wss;
}


// broadcast to all clients in room

export function broadcast(assignmentId:string,payload:WsPayload):void {
    const room=rooms.get(assignmentId)

    if(!room || room.size===0){
        // no clienyts connected
          console.log(`[WS] No clients in room ${assignmentId}, skipping broadcast`);
          return;
    }

    const message=JSON.stringify(payload);
    let sent=0;
    for (const client of room){
        if(client.readyState===WebSocket.OPEN){
            safeSend(client,payload);
            sent++;
        }
    }
    console.log(`[WS] Broadcast to room ${assignmentId}: ${sent}/${room.size} clients | event: ${payload.event}`);
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
