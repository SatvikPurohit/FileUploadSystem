import 'dotenv/config';
import prisma from './prisma/prisma.client';
import bcrypt from 'bcryptjs';

async function main(): Promise<void> {
  try {
    const email = 'demo@local.test';
    const exists = await prisma.user.findUnique({
      where: { email }
    });

    if (exists) {
      console.log(`${email} already exists`);
      return;
    }

    const hash = await bcrypt.hash('Password123!', 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hash
      }
    });

    console.log('Created user:', user.email);
  } catch (e) {
    console.error('Seed failed:', e);
    process.exit(1);
  } finally {
    // disconnect only if not using the global cached client in dev:
    if (process.env.NODE_ENV === 'production') {
      await prisma.$disconnect();
    } else {
      // In development we keep the client cached to avoid "Too many connections"
      // but explicitly close if you really want:
      // await prisma.$disconnect();
    }
  }
}

if (require.main === module) {
  main();
}

export default main;
