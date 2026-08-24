import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { ensureDefaultAchievements } from './services/achievement.service.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`SAT AI backend running on port ${env.port}`);
  ensureDefaultAchievements().catch((error) => {
    console.warn('Could not sync default achievements:', error.message);
  });
});

server.on('error', (error) => {
  console.error('MonoPrep API failed to start:', error);
  process.exitCode = 1;
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received. Closing MonoPrep API...`);

  const forceExit = setTimeout(() => {
    console.error('Graceful shutdown timed out.');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async (error) => {
    try {
      await prisma.$disconnect();
    } finally {
      clearTimeout(forceExit);
      process.exit(error ? 1 : 0);
    }
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
