// scripts/seed-user.ts
import bcrypt from "bcrypt";
import prisma from "../lib/prisma";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const email = "demo@local.test";
  const password = "Password123!";
  const hashed = await bcrypt.hash(password, 10);
  const u = await prisma.user.upsert({
    where: { email },
    update: { password: hashed },
    create: { email, password: hashed }
  });
  console.log("User:", u.email, "password:", password);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
