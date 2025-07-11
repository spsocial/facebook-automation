export * from '@prisma/client';
export { PrismaClient } from '@prisma/client';

// Re-export for convenience
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // In development, use a global variable to preserve the value
  // across module reloads caused by HMR (Hot Module Replacement).
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default prisma;

// Declare global type for TypeScript
declare global {
  var prisma: PrismaClient | undefined;
}