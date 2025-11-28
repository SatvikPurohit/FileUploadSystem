import { PrismaClient } from '@prisma/client';

const globalAny = global as any;

const prisma =
  globalAny.__prismaClient ??
  new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalAny.__prismaClient = prisma;
}

export default prisma;
