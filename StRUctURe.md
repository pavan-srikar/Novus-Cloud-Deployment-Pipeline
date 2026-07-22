This is a fantastic pivot. Transitioning the architecture from a "Health Assistant" to a "Gamified Productivity RPG" adds a layer of complexity to the logic—specifically regarding **state management for XP** and **task scheduling**—but the foundation remains solid.

I've adapted the blueprint to include a **Gamification Engine** and a more robust schema for task tracking. I've also noted your specific versions (Node v22, Prisma 7.3, PostgreSQL 18.1).

---

# AI Productivity RPG: Project Architecture Blueprint

## 1. Project Structure (File Tree)

The core addition here is a `gamification.ts` logic file and a dedicated `task` route to handle the "video game" mechanics.

```text
ai-productivity-rpg/
├── backend/
│   ├── src/
│   │   ├── server.ts           # Express entry point & Route registration
│   │   ├── orchestrator.ts     # AI Logic (Groq Chat + Gemini Memory)
│   │   ├── gamification.ts     # XP/Level math & Penalty logic
│   │   ├── middleware/
│   │   │   └── auth.ts         # JWT Verification
│   │   ├── routes/
│   │   │   ├── chat.ts         # AI interaction & progress reporting
│   │   │   └── tasks.ts        # CRUD for Daily/Weekly/Monthly goals
│   │   └── db.ts               # Prisma Client
│   ├── prisma/
│   │   └── schema.prisma       # PostgreSQL Schema (v7.3.0)
│   └── .env
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Dashboard/      # XP Bars, Level, Task Cards
    │   │   └── Chat/           # AI Coaching Interface
    │   ├── pages/
    │   │   ├── Home.tsx        # The "Quest Log" (Main Dashboard)
    │   │   └── ChatPage.tsx    # Strategy & Progress Reporting
    │   └── hooks/              # Custom hooks for XP updates
    └── tailwind.config.js

```

---

## 2. Updated Database Schema (Prisma)

To support the "Video Game" style, we need to track user stats and task frequencies.

| Table | Key Fields | Purpose |
| --- | --- | --- |
| **User** | `id`, `username`, `xp`, `level`, `streak`, `rank` | Stores the "Player" stats. |
| **Task** | `id`, `title`, `type` (Daily/Weekly/Monthly), `status`, `dueDate` | The "Quests" the user must complete. |
| **Memory** | `id`, `userId`, `content`, `category` (Goal/Preference) | AI's long-term knowledge of user lifestyle. |
| **Message** | `id`, `chatId`, `role`, `content` | Conversation history for context. |
| **XPLog** | `id`, `userId`, `amount`, `reason` | History of XP gains/losses for UI charts. |

---

## 3. Data Flow & Gamification Logic

### A. The "Quest" Loop (Chat & Tasks)

1. **Input:** User tells the AI: *"I finished my morning run but skipped the coding session."*
2. **Orchestrator:** * **Groq** generates an encouraging/disciplined response based on the "AI Coach" persona.
* **Gemini** extracts facts (e.g., "User struggles with afternoon coding") and saves to **Memory**.


3. **Gamification Engine:**
* Backend checks the Task table.
* Updates `Task` status to "Complete" (Run) and "Failed" (Coding).
* Calculates XP: `+50 XP` for the run, `-20 XP` penalty for the skip.


4. **Frontend:** The XP bar "shakes" and updates in real-time.

### B. Automatic Penalties

* A **Cron Job** (or a check upon Login) compares the current time to task `dueDates`.
* If a "Daily Quest" is incomplete by midnight, the `gamification.ts` logic automatically deducts XP and resets the streak.

---

## 4. Key AI Components

### The "Productivity Orchestrator"

* **System Prompt:** "You are a Level 99 Productivity Master. Your goal is to help the user level up in real life. Use RPG terminology (Quests, Debuffs, Buffs)."
* **Memory Integration:** Before Groq responds, the orchestrator fetches the last 5 "Facts" (e.g., "User wants to be a Senior Dev," "User is most active at 8 AM") so the advice is personalized.

### The "Memory Extractor" (Gemini 1.5 Flash)

* Runs as a background process.
* Analyzes the chat to find "Lifestyle Truths."
* *Example:* If user says "I'm feeling burnt out," Gemini saves a memory: `User is prone to burnout in February`.

---

## 5. Technology Stack (Confirmed)

* **Runtime:** Node.js v22.21.1 (Stable)
* **ORM:** Prisma 7.3.0
* **Database:** PostgreSQL 18.1
* **AI:** Groq (Llama 3 70B for speed) + Gemini 1.5 Flash (for high-context memory extraction)
* **Styling:** Tailwind CSS (No Canvas, as requested)

**How does this structure look to you?** If you're happy with the "Quest/XP" logic split, I can start by generating the `schema.prisma` file and the Backend server setup.