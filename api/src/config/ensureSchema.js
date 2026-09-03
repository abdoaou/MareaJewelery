import { randomUUID } from 'crypto'
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

/** Lucky Wheel tables (wheel_prizes, wheel_spins). */
export async function ensureWheelTables() {
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "WheelPrizeType" AS ENUM ('DISCOUNT', 'FREE_SHIPPING', 'FREE_GIFT', 'NO_PRIZE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "wheel_prizes" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "type" "WheelPrizeType" NOT NULL DEFAULT 'DISCOUNT',
        "value" DECIMAL(12,2),
        "probability" DECIMAL(10,4) NOT NULL,
        "stock" INTEGER,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "expires_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "wheel_prizes_pkey" PRIMARY KEY ("id")
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "wheel_spins" (
        "id" TEXT NOT NULL,
        "user_id" TEXT,
        "session_id" TEXT,
        "prize_id" TEXT NOT NULL,
        "coupon_code" TEXT,
        "coupon_id" TEXT,
        "campaign_key" TEXT NOT NULL DEFAULT 'default',
        "claimed_at" TIMESTAMP(3),
        "used_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "wheel_spins_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "wheel_spins_prize_id_fkey" FOREIGN KEY ("prize_id") REFERENCES "wheel_prizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "wheel_spins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "wheel_spins_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "wheel_prizes_active_sort_order_idx" ON "wheel_prizes"("active", "sort_order");
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "wheel_spins_coupon_code_idx" ON "wheel_spins"("coupon_code");
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "wheel_spins_created_at_idx" ON "wheel_spins"("created_at");
    `)

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "wheel_spins_user_id_campaign_key_key"
      ON "wheel_spins"("user_id", "campaign_key") WHERE "user_id" IS NOT NULL;
    `)
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "wheel_spins_session_id_campaign_key_key"
      ON "wheel_spins"("session_id", "campaign_key") WHERE "session_id" IS NOT NULL;
    `)
  } catch (err) {
    logger.warn('Could not ensure wheel tables', { error: err.message })
  }
}

const DEFAULT_WHEEL_PRIZES = [
  { name: '5% OFF', type: 'DISCOUNT', value: 5, probability: 18, sortOrder: 0 },
  { name: '10% OFF', type: 'DISCOUNT', value: 10, probability: 14, sortOrder: 1 },
  { name: '15% OFF', type: 'DISCOUNT', value: 15, probability: 10, sortOrder: 2 },
  { name: '20% OFF', type: 'DISCOUNT', value: 20, probability: 6, sortOrder: 3 },
  { name: 'Free Shipping', type: 'FREE_SHIPPING', value: null, probability: 10, sortOrder: 4 },
  { name: 'Free Gift', type: 'FREE_GIFT', value: null, probability: 4, sortOrder: 5 },
  { name: 'Better Luck Next Time', type: 'NO_PRIZE', value: null, probability: 38, sortOrder: 6 },
]

/** Seed default wheel prizes when table is empty. */
export async function seedDefaultWheelPrizes() {
  try {
    const count = await prisma.wheelPrize.count()
    if (count > 0) return

    for (const prize of DEFAULT_WHEEL_PRIZES) {
      await prisma.wheelPrize.create({
        data: {
          id: randomUUID(),
          name: prize.name,
          type: prize.type,
          value: prize.value,
          probability: prize.probability,
          stock: prize.type === 'NO_PRIZE' ? null : prize.type === 'FREE_GIFT' ? 50 : null,
          active: true,
          sortOrder: prize.sortOrder,
        },
      })
    }
    logger.info('Seeded default Lucky Wheel prizes')
  } catch (err) {
    logger.warn('Could not seed wheel prizes', { error: err.message })
  }
}
