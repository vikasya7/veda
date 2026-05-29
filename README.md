VedaAI — AI Assessment Creator

Generate structured question papers using AI. Built for teachers — powered by GPT-4o, BullMQ, WebSocket, and Next.js.


Table of Contents

Overview
Tech Stack
Architecture
Backend

Project Structure
Data Flow
API Reference
WebSocket Events
Setup


Frontend

Project Structure
Pages
State Management
Setup


Environment Variables
Design Decisions


Overview
VedaAI allows teachers to create assignments and generate AI-powered question papers in real time. The teacher fills a form (subject, grade, question types, difficulty distribution, marks), optionally uploads a PDF/TXT for context, and the system generates a fully structured question paper with sections, difficulty badges, and proper marks — streamed live via WebSocket.
Teacher fills form
    → Backend validates (Zod)
    → Saves to MongoDB
    → Queues BullMQ job
    → Worker calls GPT-4o
    → Validates LLM output (Zod)
    → Saves result to MongoDB + Redis cache
    → Publishes progress via Redis Pub/Sub
    → API server forwards to WebSocket room
    → Frontend receives live updates
    → Question paper renders

Tech Stack
LayerTechnologyFrontendNext.js 14 (App Router), TypeScript, ZustandBackendNode.js, Express, TypeScriptAIOpenAI GPT-4o via openai SDKQueueBullMQ (Redis-backed job queue)DatabaseMongoDB + MongooseCacheRedis (ioredis) — result cache + Pub/Sub bridgeWebSocketws library — room-based broadcastValidationZod — API layer + LLM response layerUploadMulter — PDF/TXT file handling

Architecture
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                      │
│                                                                 │
│  /assignments        /assignments/new      /assignments/[id]    │
│  List + Empty state  Create form           Progress + Output    │
│                                                                 │
│  Zustand Store ──────────────────────────────────────────────── │
│  useWebSocket hook (ws://localhost:4000/ws?assignmentId=xxx)    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP + WebSocket
┌────────────────────────────▼────────────────────────────────────┐
│                      API PROCESS (Express)                      │
│                                                                 │
│  POST /api/assignments     ← Multer → Zod → Controller          │
│  GET  /api/assignments/:id ← Redis cache → MongoDB              │
│  POST /api/assignments/:id/regenerate                           │
│  GET  /api/health                                               │
│                                                                 │
│  WebSocket Server (ws)                                          │
│  └── rooms Map: assignmentId → Set<WebSocket>                   │
│  └── Redis Subscriber → forwards pub/sub to WS rooms           │
└──────────────┬──────────────────────────┬───────────────────────┘
               │ BullMQ enqueue           │ Redis Pub/Sub
┌──────────────▼──────────────┐  ┌────────▼──────────────────────┐
│      REDIS                  │  │    WORKER PROCESS (BullMQ)    │
│                             │  │                               │
│  • BullMQ job store         │  │  1. Dequeue job               │
│  • Result cache (1h TTL)    │  │  2. Load assignment (MongoDB) │
│  • Pub/Sub channel          │  │  3. Extract file text         │
│  • WS last-state replay     │  │  4. Build prompt              │
│    ws:last:{assignmentId}   │  │  5. Call GPT-4o (3 retries)   │
└─────────────────────────────┘  │  6. Validate with Zod         │
                                 │  7. Override marks (enforce)   │
┌────────────────────────────┐   │  8. Save to MongoDB           │
│      MONGODB               │   │  9. Cache in Redis            │
│                            │   │  10. Publish progress events  │
│  assignments collection    │   └───────────────────────────────┘
│  • form data               │
│  • status                  │
│  • generatedPaper          │
│  • jobId, errorMessage     │
└────────────────────────────┘

Backend
Backend Structure
backend/
├── src/
│   ├── config/
│   │   ├── mongo.ts            # Mongoose connection
│   │   ├── redis.ts            # ioredis client + BullMQ connection
│   │   └── websocket.ts        # WS server, room map, Redis replay
│   ├── models/
│   │   └── Assignment.ts       # Mongoose schema + TypeScript interfaces
│   ├── types/
│   │   └── index.ts            # Zod schemas + inferred TypeScript types
│   ├── middleware/
│   │   ├── validate.ts         # Zod request validation middleware
│   │   ├── upload.ts           # Multer config (PDF/TXT, 10MB limit)
│   │   └── errorHandler.ts     # Global Express error handler
│   ├── controllers/
│   │   └── assignmentController.ts  # create, get, list, regenerate
│   ├── routes/
│   │   └── assignments.ts      # Route definitions + middleware chain
│   ├── services/
│   │   ├── promptBuilder.ts    # Form data → structured LLM prompt
│   │   ├── llmService.ts       # GPT-4o call + Zod validation + retry
│   │   └── cacheService.ts     # Redis get/set/del for results
│   ├── workers/
│   │   ├── queue.ts            # BullMQ Queue singleton (producer)
│   │   └── generationWorker.ts # BullMQ Worker (consumer) — full pipeline
│   └── index.ts                # Express bootstrap + Redis Pub/Sub subscriber
├── uploads/                    # Multer file storage (gitignored)
├── .env.example
├── package.json
└── tsconfig.json
Data Flow
1. POST /api/assignments (multipart/form-data)
         │
         ├── Multer        parses body + saves file to /uploads
         ├── Zod           validates shape, types, cross-field rules
         │                 (easy + medium + hard === totalQuestions)
         ├── MongoDB       Assignment.create({ status: "queued" })
         ├── BullMQ        queue.add("generate", { assignmentId })
         └── Response      { assignmentId, wsEndpoint }

2. Worker picks up job
         │
         ├── MongoDB       findById → load full assignment
         ├── File          extract text from PDF/TXT (if uploaded)
         ├── Prompt        buildUserPrompt() → structured text
         ├── Redis Pub     publish job.progress (10%)
         ├── GPT-4o        chat.completions.create()
         ├── Zod           GeneratedPaperSchema.safeParse()
         ├── Override      force marks = marksPerQuestion on every question
         ├── MongoDB       update status: "completed", save generatedPaper
         ├── Redis Cache   SET assignment:result:{id} EX 3600
         └── Redis Pub     publish job.complete with full paper

3. API process (Redis Subscriber)
         │
         ├── Redis         SET ws:last:{id} (replay for late joiners)
         └── WS broadcast  rooms.get(assignmentId) → send to all clients

4. GET /api/assignments/:id
         ├── Redis cache   check assignment:result:{id}
         └── MongoDB       fallback if cache miss
API Reference
POST /api/assignments
Create an assignment and start generation.
Content-Type: multipart/form-data
FieldTypeRequiredNotestitlestring✅3–150 charssubjectstring✅e.g. "Physics"gradestring✅e.g. "Grade 10"totalQuestionsnumber✅1–50marksPerQuestionnumber✅1–100questionTypesJSON array✅["mcq","short","long","true_false"]difficultyDistribution[easy]number✅must sum to totalQuestionsdifficultyDistribution[medium]number✅difficultyDistribution[hard]number✅dueDateISO string❌instructionsstring❌max 1000 charsfileFile❌PDF or TXT, max 10MB
Response:
json{
  "success": true,
  "data": {
    "assignmentId": "6a16daff...",
    "status": "queued",
    "wsEndpoint": "/ws?assignmentId=6a16daff..."
  }
}
GET /api/assignments
List all assignments (excludes generatedPaper for performance).
Query: ?page=1&limit=10
GET /api/assignments/:id
Get full assignment including generated paper. Checks Redis cache first.
POST /api/assignments/:id/regenerate
Re-queue a completed or failed assignment for fresh generation.
DELETE /api/assignments/:id
Delete assignment and clear Redis cache entry.
GET /api/health
Returns MongoDB + Redis connection status.

WebSocket Events
Connect: ws://localhost:4000/ws?assignmentId=<id>
EventDirectionPayloadconnectedServer → Client{ event, assignmentId, message }job.progressServer → Client{ event, assignmentId, message, progress }job.completeServer → Client{ event, assignmentId, progress: 100, data: GeneratedPaper }job.errorServer → Client{ event, assignmentId, message }
Late joiner replay: When a client connects after some events have already fired, the server replays the last known state from Redis (ws:last:{assignmentId}) immediately on connection. This prevents the progress bar from being stuck at 0%.

Backend Setup
bash# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in: MONGODB_URI, REDIS_HOST, REDIS_PORT, OPENAI_API_KEY

# 3. Start MongoDB and Redis (macOS with Homebrew)
brew services start mongodb-community
brew services start redis

# 4. Terminal 1 — API server
npm run dev

# 5. Terminal 2 — Background worker (separate process)
npm run dev:worker
Both processes must run simultaneously. The API handles HTTP + WebSocket. The worker handles AI generation. They communicate via Redis Pub/Sub.

Frontend
Frontend Structure
frontend/
├── app/
│   ├── layout.tsx                  # Root layout — Sidebar + shell
│   ├── globals.css                 # All styles (CSS variables, no Tailwind)
│   ├── page.tsx                    # Redirects → /assignments
│   └── assignments/
│       ├── page.tsx                # Empty state / assignments list
│       ├── new/
│       │   └── page.tsx            # Create assignment form
│       └── [id]/
│           └── page.tsx            # Generation progress + output
├── components/
│   ├── Sidebar.tsx                 # Fixed sidebar with nav items
│   ├── Header.tsx                  # Topbar with back button + user
│   ├── EmptyState.tsx              # No assignments illustration + CTA
│   ├── AssignmentCard.tsx          # Card with menu (View / Delete)
│   ├── AssignmentForm.tsx          # Full create form with steppers
│   ├── UploadZone.tsx              # Drag & drop file upload
│   ├── GenerationProgress.tsx      # Animated progress screen
│   └── QuestionPaper.tsx           # Formatted exam paper output
├── store/
│   └── assignmentStore.ts          # Zustand global state
├── hooks/
│   └── useWebSocket.ts             # WS connection + event handling
└── .env.local
Pages
/assignments — List / Empty state

Fetches all assignments from GET /api/assignments on mount
Shows empty state illustration if no assignments exist
Shows 2-column card grid when assignments exist
Search bar filters by title
Floating "+ Create Assignment" CTA

/assignments/new — Create form

Assignment title, subject, grade fields
Drag & drop file upload (PDF/TXT)
Due date picker
Question type rows with +/− steppers for count and marks
Difficulty distribution auto-calculated
Zod validation on submit
Submits multipart/form-data → navigates to /assignments/[id]

/assignments/[id] — Output

Opens WebSocket on mount for live updates
Polls GET /api/assignments/:id every 2s as fallback
Shows GenerationProgress with animated progress bar while generating
Renders QuestionPaper when status === "completed"
Regenerate button re-queues the job
Download as PDF button

State Management
Zustand store (store/assignmentStore.ts) holds:
typescript// Assignment list
assignments: Assignment[]

// Form draft (persists across route changes)
form: {
  title, subject, grade, dueDate,
  questionTypes: { id, type, count, marks }[],
  difficultyDistribution: { easy, medium, hard },
  instructions, file
}

// Generation state (updated by WebSocket)
currentAssignmentId: string | null
generationStatus: "idle" | "queued" | "processing" | "completed" | "failed"
generationProgress: number       // 0–100
generationMessage: string

// Output
generatedPaper: GeneratedPaper | null
Frontend Setup
bash# 1. Install dependencies
npm install zustand

# 2. Configure environment
# Create .env.local:
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000

# 3. Run dev server
npm run dev
# → http://localhost:3000

Environment Variables
Backend .env
bashPORT=4000
MONGODB_URI=mongodb://localhost:27017/veda-ai
REDIS_HOST=localhost
REDIS_PORT=6379
OPENAI_API_KEY=sk-...
MAX_FILE_SIZE_MB=10
NODE_ENV=development
Frontend .env.local
bashNEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000

Design Decisions
Two Zod validation layers

Layer 1 (API): Validates the teacher's form input before anything hits the DB. Returns { field, message }[] errors the frontend renders directly on the form.
Layer 2 (Worker): Validates the LLM's JSON response before it's saved to MongoDB. If the LLM returns malformed JSON or wrong schema, the worker retries with a corrective prompt (up to 3 times).

Redis Pub/Sub as inter-process bridge
The API and worker are separate Node.js processes with separate memory. Direct WebSocket broadcast from the worker would write to an empty rooms Map. Redis Pub/Sub solves this — the worker publishes progress events to a Redis channel, the API process subscribes and forwards to the correct WebSocket room.
Late-joiner WebSocket replay
Generation takes 5–15 seconds. The frontend often connects to the WebSocket after several progress events have already fired. Every event is saved to Redis (ws:last:{assignmentId}, 1h TTL) and replayed to clients that connect late, so the progress bar never starts at 0% when the job is already halfway done.
Marks enforcement in post-processing
LLMs are unreliable with exact numbers. Even with explicit prompting ("EVERY question must be EXACTLY 5 marks"), the model drifts — especially for long answer questions. Rather than prompt-engineering around this, the worker overrides every question.marks field after generation and recalculates totalMarks. The LLM owns question content; the application owns numbers.
BullMQ over direct async
AI generation takes 5–15 seconds. Doing it synchronously in the HTTP handler would block the response and time out under load. BullMQ gives retry logic, concurrency control (3 parallel jobs), visibility into job state, and clean separation between accepting a request and processing it.
Polling + WebSocket (belt and suspenders)
The [id] page polls GET /api/assignments/:id every 2 seconds alongside the WebSocket connection. This handles: (1) jobs that complete before the frontend connects, (2) WebSocket disconnections, (3) page refreshes mid-generation. Polling stops as soon as status === "completed" or "failed".