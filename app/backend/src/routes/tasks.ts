import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// GET /api/tasks - Fetch top-level tasks with their nested subtasks
router.get('/', authenticateToken, async (req: any, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { 
        userId: req.user.userId,
        parentId: null // Only get main tasks; subtasks are nested inside
      },
      include: { 
        subTasks: {
          orderBy: { createdAt: 'asc' }
        } 
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Failed to load the Quest Log." });
  }
});

// POST /api/tasks - Add a new quest (Supports subtask creation via parentId)
router.post('/', authenticateToken, async (req: any, res: Response) => {
  const { title, type, category, parentId } = req.body;

  try {
    const task = await prisma.task.create({
      data: {
        title,
        type: type || 'DAILY',
        category: category || 'General',
        status: 'PENDING',
        parentId: parentId || null, // Connect to a parent if provided
        user: { connect: { id: req.user.userId } }
      }
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: "Could not scribe this quest." });
  }
});

// POST /api/tasks/:id/complete - Complete & Auto-handle Parent Logic
router.post('/:id/complete', authenticateToken, async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    // 1. Fetch task with parent and sibling data
    const task = await prisma.task.findUnique({ 
      where: { id },
      include: { 
        parent: { 
          include: { subTasks: true } 
        } 
      }
    });

    if (!task || task.userId !== userId) {
      return res.status(404).json({ error: "Quest not found." });
    }
    if (task.status === 'COMPLETED') {
      return res.status(400).json({ error: "Already completed." });
    }

    // 2. Award XP Logic
    const xpTable: Record<string, number> = { DAILY: 20, WEEKLY: 100, EPIC: 500 };
    const reward = xpTable[task.type] || 10;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User missing." });

    let totalNewXp = user.xp + reward;
    let newLevel = user.level;

    if (totalNewXp >= 100) {
      const levelGains = Math.floor(totalNewXp / 100);
      newLevel += levelGains;
      totalNewXp = totalNewXp % 100;
    }

    // 3. TRANSACTION: Update Task, User, and check Parent Auto-Complete
    const result = await prisma.$transaction(async (tx) => {
      // Complete current task
      const updatedTask = await tx.task.update({
        where: { id },
        data: { status: 'COMPLETED' }
      });

      // Update User XP/Level
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { xp: totalNewXp, level: newLevel }
      });

      // --- AUTO-COMPLETE PARENT LOGIC ---
      if (task.parentId && task.parent) {
        // Check if all siblings (including this one) are now completed
        const otherSubtasks = task.parent.subTasks.filter(st => st.id !== id);
        const allOthersDone = otherSubtasks.every(st => st.status === 'COMPLETED');

        if (allOthersDone) {
          await tx.task.update({
            where: { id: task.parentId },
            data: { status: 'COMPLETED' }
          });
        }
      }

      return { updatedTask, updatedUser };
    });

    res.json({ 
      message: newLevel > user.level ? "LEVEL UP!" : "Sub-quest Cleared!", 
      xpGained: reward, 
      currentXp: result.updatedUser.xp,
      currentLevel: result.updatedUser.level
    });

  } catch (error) {
    console.error("Task Error:", error);
    res.status(500).json({ error: "Quest completion failed." });
  }
});

export default router;