import 'dotenv/config'; 
import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  // In Prisma 7, we point to the DATABASE_URL in the environment
  datasource: {
    url: process.env.DATABASE_URL,
  },
});