import { PrismaClient } from '@prisma/client';

let prismaClient: PrismaClient | null = null;

export const getPrisma = async () => {
  if (!prismaClient) {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is missing. Please configure the database.');
      return null;
    }
    try {
      const client = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL + (process.env.DATABASE_URL.includes('?') ? '&' : '?') + 'connection_limit=10&pool_timeout=30',
          },
        },
      });
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
