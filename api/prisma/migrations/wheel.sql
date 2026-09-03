-- Lucky Wheel migration for Supabase/PostgreSQL
-- Run once if not using ensureSchema.js auto-migration on API startup.

DO $$ BEGIN
  CREATE TYPE "WheelPrizeType" AS ENUM ('DISCOUNT', 'FREE_SHIPPING', 'FREE_GIFT', 'NO_PRIZE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

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

CREATE INDEX IF NOT EXISTS "wheel_prizes_active_sort_order_idx" ON "wheel_prizes"("active", "sort_order");
CREATE INDEX IF NOT EXISTS "wheel_spins_coupon_code_idx" ON "wheel_spins"("coupon_code");
CREATE INDEX IF NOT EXISTS "wheel_spins_created_at_idx" ON "wheel_spins"("created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "wheel_spins_user_id_campaign_key_key"
  ON "wheel_spins"("user_id", "campaign_key") WHERE "user_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "wheel_spins_session_id_campaign_key_key"
  ON "wheel_spins"("session_id", "campaign_key") WHERE "session_id" IS NOT NULL;
