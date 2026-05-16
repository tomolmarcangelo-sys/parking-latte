import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.user.upsert({ where: { email: 'test1@test.com' }, update: { emailVerified: true }, create: { email: 'test1@test.com', name: 'Test', role: 'CUSTOMER', emailVerified: true } })
  .then(console.log)
  .catch(console.error)
  .finally(() => p.$disconnect());
