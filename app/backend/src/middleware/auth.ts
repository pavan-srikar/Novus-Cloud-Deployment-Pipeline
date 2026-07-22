import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';


const router = Router();

export const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log("❌ No token found in request headers");
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    
    // ATTACH THE USER TO THE REQUEST
    req.user = decoded; 
    
    console.log(`✅ Hero Authenticated: ${decoded.userId}`);
    next();
  } catch (err) {
    console.error("❌ JWT Verification Failed");
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

// --- REGISTER ROUTE ---
// Adding 'any' to req/res is a quick way to bypass the Strict Type mismatch 
// that sometimes happens with Express + ESM + Async
router.post('/register', async (req: any, res: any) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required." });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: "This hero name is already taken." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        level: 1,
        xp: 0
      }
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    // Explicitly return the response to prevent "hanging" requests
    return res.status(201).json({ 
      message: "Hero created successfully!",
      token, 
      user: { id: user.id, username: user.username, level: user.level, xp: user.xp } 
    });
  } catch (error) {
    console.error("Registration Error:", error);
    return res.status(500).json({ error: "The Guild Registry is down." });
  }
});

// --- LOGIN ROUTE ---
router.post('/login', async (req: any, res: any) => {
  const { username, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    return res.json({ 
      token, 
      user: { id: user.id, username: user.username, level: user.level, xp: user.xp } 
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ error: "Authentication crystals are failing." });
  }
});

// --- ME ROUTE ---
router.get('/me', authenticateToken, async (req: any, res: any) => {
  try {
    // Safety check: ensure the middleware actually passed the userId
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: "Unauthorized: No hero session found." });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { 
        id: true, 
        username: true, 
        level: true, 
        xp: true 
      }
    });

    if (!user) {
      return res.status(404).json({ error: "This hero no longer exists in the archives." });
    }

    return res.json(user);
  } catch (error) {
    console.error("Auth Me Error:", error);
    return res.status(500).json({ error: "The scrying orb is clouded. (Server Error)" });
  }
});

export default router;