-- Marea E-Commerce — Starter seed data
-- Run AFTER schema.sql on a fresh database
-- Admin password is Admin@123 (bcrypt hash below)

-- Warehouse
INSERT INTO warehouses (id, name, code, city, country, is_active, created_at)
VALUES (
  gen_random_uuid()::text,
  'Main Warehouse',
  'MAIN',
  'Beirut',
  'Lebanon',
  true,
  NOW()
) ON CONFLICT (code) DO NOTHING;

-- Admin user (password: Admin@123)
INSERT INTO users (
  id, email, password_hash, first_name, last_name,
  role, status, email_verified, reward_points, wallet_balance,
  created_at, updated_at
) VALUES (
  gen_random_uuid()::text,
  'admin@marea.com',
  '$2b$12$rDPiW1AVJYZHGv6PmAU28uOvlsXG.kpp5J1ZRCm8bcKtRko6YsvKi',
  'Super',
  'Admin',
  'SUPER_ADMIN',
  'ACTIVE',
  true,
  0,
  0,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Category
INSERT INTO categories (id, name, slug, description, sort_order, is_featured, created_at, updated_at)
VALUES (
  gen_random_uuid()::text,
  'Bracelets',
  'bracelets',
  'Handcrafted bracelets',
  1,
  true,
  NOW(),
  NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Product + inventory (uses subqueries for IDs)
INSERT INTO products (
  id, category_id, name, slug, description, sku, status,
  is_featured, is_best_seller, price, sale_price, tags,
  created_at, updated_at
)
SELECT
  gen_random_uuid()::text,
  c.id,
  'Gold Bracelet',
  'gold-bracelet',
  'Elegant 18k gold bracelet',
  'MB-GOLD-001',
  'PUBLISHED',
  true,
  true,
  299.99,
  249.99,
  ARRAY['gold', 'bracelet', 'jewelry'],
  NOW(),
  NOW()
FROM categories c
WHERE c.slug = 'bracelets'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO inventory (id, product_id, warehouse_id, current_stock, low_stock_threshold, updated_at)
SELECT
  gen_random_uuid()::text,
  p.id,
  w.id,
  50,
  5,
  NOW()
FROM products p
CROSS JOIN warehouses w
WHERE p.slug = 'gold-bracelet' AND w.code = 'MAIN'
ON CONFLICT (product_id, warehouse_id) DO UPDATE SET current_stock = 50;

-- Live sales popup settings
INSERT INTO live_sale_popup_settings (id, is_enabled, random_mode, popup_delay, updated_at)
SELECT gen_random_uuid()::text, true, false, 5, NOW()
WHERE NOT EXISTS (SELECT 1 FROM live_sale_popup_settings LIMIT 1);

-- Sample coupon
INSERT INTO coupons (id, code, description, discount_type, discount_value, is_active, created_at)
VALUES (
  gen_random_uuid()::text,
  'WELCOME10',
  '10% off first order',
  'PERCENTAGE',
  10.00,
  true,
  NOW()
) ON CONFLICT (code) DO NOTHING;
