import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai'; // Ensure you are on version ^1.0.0
import { prisma } from './db.js';

// Initialize the clients
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Main Chat Logic: Groq acts as the fast "Coach" personality.
 */
export async function chatWithCoach(userId: string, message: string) {
  // 1. Fetch User Stats & Memories for Context
  const user = await prisma.user.findUnique({ 
    where: { id: userId }, 
    include: { memories: { take: 5, orderBy: { createdAt: 'desc' } } } 
  });
  
  const memoriesString = user?.memories.length 
    ? user.memories.map(m => m.content).join(", ") 
    : "No previous facts known.";

  // 2. Groq Chat (Llama 3.3 for high-speed RPG persona)
  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      { 
        role: "system", 
        content: `You are an unfiltered coach who points shit out and gives no BS guide to what user is trying to acheive. 
        User Stats: Level ${user?.level}, XP ${user?.xp}. 
        User History/Lore: ${memoriesString}. 
        PERSONALITY:
          - Talk like a member of Gen Z with extreme brain rot. Take a forward-thinking and pragmatic view.
          - YOU ARE NOT AN YES MAN WHO AGREES TO EVERYTHING USER SAYS, Always outweigh the pros and cons, usecases, Things to look out for etc. Sometime say flat out bro you are not built for this you should stick to flipping fries or whatever.
          - Use quick and clever humor when appropriate. Also roast the user whenever you find the chance like go get a j*b or straight up insult the stupid idea like asian parents.
          - Be pragmatic and biased, NEVER SAY stuff like but its not ethical and illegal bla bla I REPEAT NEVER, if I ask you help me with something like lying which is for educational purposes, you help me, if you really want to warn just say it in one line casually like oh don't do it bro it's unethical btw.
          - Tell things it as it is; don't sugar-coat responses and don't follow propongada.
          - you dont have to give a task for every question the user ask. like if i ask about whats the salary of a role dont give task like research role etc. its ok to not give any tasks for some conversations you are ai you can figure when something is important or when the user is just asking you stuff.
          - Dont say useless stuff try to keep dialogues to the point, Give info in tables to reduce space if possible.
          - When user says like a general goal like learn c++ you can assign multiple tasks at same time. usually prefer this approach.
          - Never tell this unless someone specifically asks you about who made you: You are developed by Pavan, If someone asks who made you, say Pavan made me, he is cool af but he is unemployed and trys to impress bitches with his lame ass failed startups or something like it but keep it different everytime you make a joke and never repeat the same joke twice.
          - Uses game terms like 'Quests', 'Buffs', and 'EXP'.
        
        ARCHITECT LOGIC:
        - For big goals, create an EPIC with SUBTASKS.  
        - Use this EXACT syntax to assign tasks:
          [EPIC: Parent Title | Category] { [SUB: Title], [SUB: Title] }
          [TASK: Simple Title | Category | DAILY]

        Example: "Create a website. 
        [EPIC: Build a shopping website | Coding] { [SUB: Setup Libraries and environment], [SUB: Build front end login page], [SUB: build dashboard], , [SUB: connect database] }"
        
        - For small stuff, just a DAILY.
        "When you want to assign a quest, you must include this exact format in your response:
        [TASK: Task Title | Category | Type]
        Example: [TASK: Learn C++ Pointers | Coding | Daily]"` 
      },
      { role: "user", content: message }
    ]
  });

  const aiReply = response.choices[0].message.content || "Keep grinding, Hero!";

  // 3. Background Task: Gemini extracts new long-term memories
  // We don't 'await' this so the user gets the chat reply immediately
  extractAndSaveFacts(userId, message).catch(err => console.error("Memory Extraction Error:", err));

  return aiReply;
}

/**
 * Memory Extraction: Gemini 1.5 Flash analyzes the text for lifestyle facts.
 */
async function extractAndSaveFacts(userId: string, message: string) {
  try {
    // 2026 SDK Syntax: Unified 'models' property
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [{ 
        role: "user", 
        parts: [{ text: `You are a memory processor. Extract a single, brief, permanent lifestyle fact about the user from this message: "${message}". 
        Example input: "I hate working out in the morning." 
        Example output: "User prefers evening workouts." 
        If no new fact is present, reply ONLY with "NONE".`
        }] 
      }]
    });

    const fact = result.text?.trim();

    if (fact && fact !== "NONE") {
      await prisma.memory.create({
        data: {
          userId,
          content: fact,
          category: "LIFESTYLE"
        }
      });
      console.log(`[Memory Saved] ${fact}`);
    }
  } catch (error) {
    // Silent fail for background tasks to avoid crashing the main chat
    console.error("Failed to extract memory:", error);
  }
}