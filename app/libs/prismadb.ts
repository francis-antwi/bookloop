import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Use existing global prisma client if available
const prisma = global.prisma || new PrismaClient();

// Assign to global so it persists across module reloads (especially in development)
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
