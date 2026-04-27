import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/index.js";

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

const email = (getArg("--email") ?? "").trim().toLowerCase();
const password = getArg("--password") ?? "";

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL in env.");
  process.exit(1);
}

if (!email || !password) {
  console.error("Usage: node scripts/create-admin.mjs --email you@x.com --password '...'");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN" },
    create: { email, passwordHash, role: "ADMIN" },
  });

  console.log(`Admin ready: ${user.email} (${user.id})`);
} finally {
  await prisma.$disconnect();
}

