import { PrismaClient } from '@prisma/client';

let prismaClient: PrismaClient | null = null;

export const getPrisma = async () => {
  if (!prismaClient) {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is missing. Please configure the database.');
      return null;
    }
    try {
      const client = new PrismaClient();
      await client.$queryRaw`SELECT 1`;
      prismaClient = client;
    } catch (e) {
      console.error('Failed to initialize Prisma client. Error details:', e);
      prismaClient = null;
    }
  }
  return prismaClient;
};

export const getPrismaClient = getPrisma;
