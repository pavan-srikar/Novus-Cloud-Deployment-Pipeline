import { prisma } from './db.js';

export const XP_GOAL = 100; // XP needed per level

export async function addXP(userId: string, amount: number, reason: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  let newXP = user.xp + amount;
  let newLevel = user.level;

  // Level Up Logic
  if (newXP >= XP_GOAL) {
    newXP -= XP_GOAL;
    newLevel += 1;
  }

  // Penalty Logic (XP can't go below 0)
  if (newXP < 0) newXP = 0;

  return await prisma.user.update({
    where: { id: userId },
    data: {
      xp: newXP,
      level: newLevel,
      xpLogs: { create: { amount, reason } }
    }
  });
}