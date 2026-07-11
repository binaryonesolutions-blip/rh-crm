-- ============================================================
-- Rhombus Concrete — Migration v2
-- Run in: Supabase Dashboard > SQL Editor > New Query
-- Adds: fuel_levy, pump_charge, mob_fee, pump_enabled columns
--       to quote_line_items; adds vat_rate to quotes.
-- Safe to run multiple times (uses IF NOT EXISTS / DO blocks).
-- ============================================================

-- 1. quote_line_items — new columns
ALTER TABLE quote_line_items
  ADD COLUMN IF NOT EXISTS fuel_levy    NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pump_charge  NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mob_fee      NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pump_enabled BOOLEAN       NOT NULL DEFAULT false;

-- 2. quotes — VAT rate picker (0, 0.08, 0.16)
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,4) NOT NULL DEFAULT 0.16;

-- 3. Back-fill fuel_levy from legacy transport column
UPDATE quote_line_items SET fuel_levy = transport WHERE fuel_levy = 0 AND transport > 0;

-- 4. Back-fill pump_charge from legacy pumping column
UPDATE quote_line_items SET pump_charge = pumping, pump_enabled = true WHERE pump_charge = 0 AND pumping > 0;

-- Done
SELECT 'Migration v2 applied successfully' AS status;
