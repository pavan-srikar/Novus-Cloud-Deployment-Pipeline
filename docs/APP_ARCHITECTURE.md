# App Architecture

How the actual application works like the full stack stuff.

Novus is a task tracker with an AI coach layered on top: you chat with it about what you're working on, it assigns you tasks based on the conversation, and completing tasks earns XP and levels — the productivity system is framed as a game rather than a plain to-do list.

## Stack

**Backend:** Express 5 + TypeScript, Prisma 6 (PostgreSQL), JWT auth (`jsonwebtoken`)

**AI:** Groq SDK (chat) + `@google/genai` (background memory extraction)

**Frontend:** React 19, Vite, Tailwind CSS, Axios

## File structure

```
app/backend/src/
├── server.ts              Express entry point, route mounting, CORS, error handler
├── orchestrator.ts        AI logic — Groq for chat, Gemini for memory extraction
├── gamification.ts        XP/level math
├── db.ts                  Prisma client singleton
├── middleware/
│   └── auth.ts            Register/login + JWT verification middleware
└── routes/
    ├── chat.ts             Chat endpoint, task auto-extraction from AI replies
    └── tasks.ts            Task CRUD, completion + XP awarding

app/frontend/src/
├── api.tsx                 Axios instance, attaches JWT from localStorage to every request
└── pages/
    ├── LoginPage.tsx
    ├── ChatPage.tsx
    └── (dashboard/task views)
```

## Data model (`schema.prisma`)

| Model | Purpose |
|---|---|
| `User` | `xp`, `level`, `streak`, plus relations to everything below |
| `Task` | Self-referencing (`parentId` / `subTasks`) — supports a task having child subtasks. `type` is `DAILY`, `WEEKLY`, or `EPIC`; `status` is `PENDING` or `COMPLETED` |
| `Memory` | Freeform facts the AI has learned about the user over time (see *Memory extraction* below) |
| `Chat` / `Message` | Standard chat session + message history, one `Chat` has many `Message`s |
| `XPLog` | Audit trail of every XP change and why it happened |

## Auth flow

`POST /api/auth/register` and `/login` (`middleware/auth.ts`) hash/verify passwords and issue a JWT (`jsonwebtoken`, 7-day expiry) containing the user's ID. The frontend stores this in `localStorage`; `api.tsx`'s Axios instance attaches it as a `Bearer` token on every outgoing request automatically. `authenticateToken` middleware verifies that token on every protected route and attaches `req.user` for handlers to use.

## The chat → task pipeline

This is the core mechanic. `POST /api/chat` (`routes/chat.ts`):

1. Calls `chatWithCoach()` in `orchestrator.ts`, which sends the message to Groq along with the user's current level/XP and their last 5 saved `Memory` entries as context, so responses are personalized rather than generic
2. The AI's system prompt instructs it to embed task assignments directly in its reply using a specific bracket syntax:
   ```
   [EPIC: Build a portfolio site | Coding] { [SUB: Set up the project], [SUB: Build the homepage] }
   [TASK: Read one chapter | Reading | DAILY]
   ```
3. After the reply comes back, `chat.ts` **parses the raw text** line-by-line with regex, looking for those bracket patterns, and creates real `Task` rows from them — `EPIC` becomes a parent task, each `SUB` becomes a child task linked via `parentId`
4. Both the user's message and the AI's reply are saved to `Message`, tied to a `Chat` session

In parallel, **not awaited**, `orchestrator.ts` fires off a second call to Gemini (`extractAndSaveFacts`) that reads the same user message and asks it to extract one durable fact ("User prefers evening workouts") to save as a `Memory` row — or reply `NONE` if there's nothing worth remembering. This runs in the background so it doesn't add latency to the chat response, and failures here are swallowed silently so a memory-extraction hiccup never breaks the actual chat reply.

## Gamification / XP

`gamification.ts` and the `/complete` handler in `tasks.ts` both do XP math, for different situations — `gamification.ts::addXP()` is a general-purpose helper, while task completion currently does its own inline calculation (reward amount depends on task type: `DAILY` = 20 XP, `WEEKLY` = 100, `EPIC` = 500). Leveling up is just `xp >= 100` rolling over into `level += 1, xp -= 100`, done in a loop so multiple level-ups from one big XP reward (e.g. completing an `EPIC`) are handled correctly in one pass.

Completing a task also checks whether it was the last incomplete subtask under a parent `EPIC` — if so, the parent auto-completes too. All of this (task status update, user XP/level update, parent auto-complete check) happens inside a single Prisma `$transaction`, so a failure partway through can't leave XP awarded but the task still marked incomplete, or vice versa.

## A note on the AI's personality

The system prompt in `orchestrator.ts` is intentionally written with a specific blunt, no-sugarcoating tone rather than a generic helpful-assistant voice — this is a deliberate product choice (a "coach" that pushes back rather than just agreeing with everything), not a default.