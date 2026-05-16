import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.user.upsert({ where: { email: 'test1@test.com' }, update: { emailVerified: true }, create: { email: 'test1@test.com', name: 'Test', role: 'CUSTOMER', emailVerified: true } })
  .then((res) => { console.log("SUCCESS:", res); p.$disconnect(); })
  .catch((err) => { console.error("ERROR:", err); p.$disconnect(); });
