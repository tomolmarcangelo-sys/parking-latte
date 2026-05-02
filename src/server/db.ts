import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Test connection and log errors clearly
if (process.env.DATABASE_URL) {
  prisma.$connect()
    .then(() => console.log('Successfully connected to the database.'))
    .catch((err) => {
      console.error('FAILED to connect to the database.');
      console.error('Error Details:', err.message);
    });
} else {
  console.error('CRITICAL: DATABASE_URL environment variable is missing.');
  console.error('Please add DATABASE_URL to your Secrets in AI Studio.');
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
