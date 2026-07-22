import { PrismaClient } from "@prisma/client";

import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

// Ensure your .env has the correct DATABASE_URL
const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL 
});

const adapter = new PrismaPg(pool);

// This matches Prisma 7 standards
export const prisma = new PrismaClient({ adapter });