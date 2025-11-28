import { PrismaClient } from '@prisma/client';

declare global {
  // Prevent "Cannot redeclare block-scoped variable" in TS
  // and allow reuse across HMR (ts-node-dev or nodemon)
  var __prismaClient: PrismaClient | undefined;
}

const prisma =
  global.__prismaClient ??
  new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prismaClient = prisma;
}

export default prisma;
