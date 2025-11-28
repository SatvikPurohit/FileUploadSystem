require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    const exists = await prisma.user.findUnique({
      where: { email: 'demo@local.test' }
    });

    if (exists) {
      console.log('demo@local.test already exists');
      return;
    }

    const hash = await bcrypt.hash('Password123!', 10);
    const user = await prisma.user.create({
      data: {
        email: 'demo@local.test',
        password: hash
      }
    });

    console.log('Created user:', user.email);
  } catch (e) {
    console.error('Seed failed:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
