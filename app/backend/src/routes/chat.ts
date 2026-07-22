import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { chatWithCoach } from '../orchestrator.js';

const router = Router();

// 1. Fetch all chat sessions for sidebar
router.get('/', authenticateToken, async (req: any, res: Response) => {
  try {
    const chats = await prisma.chat.findMany({
      where: { userId: req.user.userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, updatedAt: true }
    });
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: "Failed to load chronicles." });
  }
});

// 2. Fetch messages for a specific chat
router.get('/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const messages = await prisma.message.findMany({
      where: { chatId: req.params.id },
      orderBy: { createdAt: 'asc' }
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to load messages." });
  }
});

// 3. Send message & Auto-generate Nested Tasks
router.post('/', authenticateToken, async (req: any, res: Response) => {
  const { message, chatId } = req.body;
  const userId = req.user.userId;

  try {
    const aiReply = await chatWithCoach(userId, message);

    // Create or Update Chat Session
    let chatSession;
    if (chatId) {
      chatSession = await prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() }
      });
    } else {
      chatSession = await prisma.chat.create({
        data: { userId }
      });
    }

    // Save Chat History
    await prisma.message.createMany({
      data: [
        { chatId: chatSession.id, role: 'user', content: message },
        { chatId: chatSession.id, role: 'assistant', content: aiReply }
      ]
    });

    // --- ENHANCED TASK EXTRACTION LOGIC ---
    // Pattern 1: [EPIC: Title | Category]
    // Pattern 2: [SUB: Title | Category]
    // Pattern 3: [TASK: Title | Category | Type] (For standalone tasks)
    
// --- UPDATED TASK EXTRACTION LOGIC ---
    // --- FORTIFIED TASK EXTRACTION LOGIC ---
    const lines = aiReply.split('\n');
    let lastEpicId: string | null = null;

    for (const line of lines) {
      // Clean the line of markdown bolding stars so regex doesn't get confused
      const cleanLine = line.replace(/\*\*/g, '');

      // 1. Handle EPIC Tasks
      const epicMatch = cleanLine.match(/\[EPIC:\s*([^\]|]+)(?:\||\])\s*([^\]]*)/i);
      if (epicMatch) {
        const epic = await prisma.task.create({
          data: {
            userId,
            title: epicMatch[1].trim(),
            category: epicMatch[2]?.trim() || 'General',
            type: 'EPIC',
            status: 'PENDING'
          }
        });
        lastEpicId = epic.id; 
        console.log("✅ Created EPIC with ID:", lastEpicId);
        continue;
      }

      // 2. Handle SUB-TASKS (Flexible for tables and markdown)
      // This regex looks for [SUB: Title] and then optionally a | Category outside
      const subMatch = cleanLine.match(/\[SUB:\s*([^\]]+)\]/i);
      if (subMatch) {
        // Try to find a category after the bracket or in the table cell
        const categoryMatch = cleanLine.split(']')[1]?.match(/\|?\s*([^|]+)/);
        const category = categoryMatch ? categoryMatch[1].trim() : 'General';

        const subtask = await prisma.task.create({
          data: {
            userId,
            title: subMatch[1].trim(),
            category: category,
            type: 'DAILY',
            status: 'PENDING',
            parentId: lastEpicId // Now this will persist correctly
          }
        });
        console.log(`✅ Created SUBTASK: "${subMatch[1].trim()}" | Parent: ${lastEpicId}`);
        continue;
      }

      // 3. Handle Legacy Standalone Tasks
      const taskMatch = cleanLine.match(/\[TASK:\s*([^|]+)\|([^|]+)\|([^\]]+)\]/i);
      if (taskMatch) {
        await prisma.task.create({
          data: {
            userId,
            title: taskMatch[1].trim(),
            category: taskMatch[2].trim(),
            type: taskMatch[3].trim().toUpperCase() === 'EPIC' ? 'EPIC' : 'DAILY',
            status: 'PENDING'
          }
        });
      }
    }

    res.json({ reply: aiReply, chatId: chatSession.id });
  } catch (error) {
    console.error("Coach Error:", error);
    res.status(500).json({ error: "The Scribe is failing." });
  }
});

export default router;