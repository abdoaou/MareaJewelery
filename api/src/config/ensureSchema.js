import prisma from './prisma.js'
import { logger } from '../shared/utils/logger.js'

/** Create site_visits without blocking deploy on prisma db push failures. */
export async function ensureSiteVisitsTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "site_visits" (
        "id" TEXT NOT NULL,
        "session_id" TEXT NOT NULL,
        "path" TEXT NOT NULL DEFAULT '/',
        "visited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "site_visits_pkey" PRIMARY KEY ("id")
      );
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "site_visits_session_id_idx" ON "site_visits"("session_id");
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "site_visits_visited_at_idx" ON "site_visits"("visited_at");
    `)
  } catch (err) {
    logger.warn('Could not ensure site_visits table', { error: err.message })
  }
}
