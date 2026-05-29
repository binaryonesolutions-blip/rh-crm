-- ============================================================
-- Rhombus Concrete Quotation App — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────────────────────
-- 1. STAFF
-- ──────────────────────────────────────────────────────────────
CREATE TABLE staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT UNIQUE,
  role        TEXT NOT NULL DEFAULT 'fso'
                CHECK (role IN ('fso', 'sales_admin', 'sales_manager', 'it_admin')),
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 2. PRICE LIST
-- Grade × Distance band × Pump = up to 48 combinations
-- Mirrors Odoo Option A (Section 9 of the setup guide)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE price_list (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade          TEXT NOT NULL CHECK (grade IN ('C15','C20','C25','C30','C35','C40')),
  distance_band  TEXT NOT NULL CHECK (distance_band IN ('0-10km','10-25km','25-50km','50+km')),
  pump_required  BOOLEAN NOT NULL DEFAULT false,
  unit_price_kes NUMERIC(12,2) NOT NULL,
  valid_from     DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to       DATE,
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (grade, distance_band, pump_required)
);

-- ──────────────────────────────────────────────────────────────
-- 3. QUOTES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE quotes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_number            TEXT UNIQUE NOT NULL,       -- e.g. RCL/2026/08/001
  invoice_number       TEXT,                        -- e.g. 46168 (sequential display number)
  status               TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','sent','confirmed','invoiced')),
  quoted_by_id         UUID REFERENCES staff(id),
  quoted_by_name       TEXT NOT NULL,               -- denormalised snapshot
  client_name          TEXT NOT NULL,
  cc                   TEXT,
  site                 TEXT NOT NULL,
  subject              TEXT NOT NULL DEFAULT 'Quotation for the supply of Ready Mix Concrete',
  quote_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  -- SAP B1 link fields (mirrors x_sap_quote_no / x_sap_so_no in Odoo)
  sap_quote_no         TEXT,
  sap_so_no            TEXT,
  -- Odoo opportunity link (paste the Odoo opportunity URL or ID)
  odoo_opportunity_ref TEXT,
  -- Computed totals (kept in sync by trigger)
  subtotal             NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_vat            NUMERIC(14,2) NOT NULL DEFAULT 0,
  grand_total          NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 4. QUOTE LINE ITEMS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE quote_line_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id     UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  qty          NUMERIC(10,2) NOT NULL,
  description  TEXT NOT NULL,
  unit_price   NUMERIC(12,2) NOT NULL,
  transport    NUMERIC(12,2) NOT NULL DEFAULT 0,
  pumping      NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_levy     NUMERIC(12,2) NOT NULL DEFAULT 550,  -- default 550, editable
  -- Computed columns (calculated on save)
  line_subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,   -- qty*(unit+transport+pumping+levy)
  vat_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,   -- line_subtotal * 0.16
  line_total    NUMERIC(14,2) NOT NULL DEFAULT 0,   -- line_subtotal + vat_amount
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 5. PI NUMBER SEQUENCE
-- Auto-generates RCL/YYYY/MM/NNN
-- ──────────────────────────────────────────────────────────────
CREATE SEQUENCE pi_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_pi_number()
RETURNS TEXT AS $$
DECLARE
  seq_val INT;
  yr      TEXT;
  mo      TEXT;
BEGIN
  seq_val := nextval('pi_number_seq');
  yr      := TO_CHAR(NOW(), 'YYYY');
  mo      := TO_CHAR(NOW(), 'MM');
  RETURN 'RCL/' || yr || '/' || mo || '/' || LPAD(seq_val::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────
-- 6. TRIGGERS
-- ──────────────────────────────────────────────────────────────

-- 6a. Auto-set PI number on insert
CREATE OR REPLACE FUNCTION set_pi_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pi_number IS NULL OR NEW.pi_number = '' THEN
    NEW.pi_number := generate_pi_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_pi_number
  BEFORE INSERT ON quotes
  FOR EACH ROW EXECUTE FUNCTION set_pi_number();

-- 6b. Auto-update updated_at on quotes
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 6c. Recalculate quote totals when a line item changes
CREATE OR REPLACE FUNCTION recalc_quote_totals()
RETURNS TRIGGER AS $$
DECLARE
  q_id UUID;
BEGIN
  -- Use the quote_id from whichever row triggered this
  IF TG_OP = 'DELETE' THEN
    q_id := OLD.quote_id;
  ELSE
    q_id := NEW.quote_id;
  END IF;

  UPDATE quotes SET
    subtotal    = COALESCE((SELECT SUM(line_subtotal) FROM quote_line_items WHERE quote_id = q_id), 0),
    total_vat   = COALESCE((SELECT SUM(vat_amount)    FROM quote_line_items WHERE quote_id = q_id), 0),
    grand_total = COALESCE((SELECT SUM(line_total)    FROM quote_line_items WHERE quote_id = q_id), 0),
    updated_at  = now()
  WHERE id = q_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalc_on_line_change
  AFTER INSERT OR UPDATE OR DELETE ON quote_line_items
  FOR EACH ROW EXECUTE FUNCTION recalc_quote_totals();

-- ──────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY (RLS)
-- All authenticated users can read/write — no per-FSO isolation
-- needed in this app (unlike Odoo where FSOs see only their own).
-- Adjust if you add Supabase Auth later.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE staff            ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list       ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users full access (tighten per role later)
CREATE POLICY "auth_all_staff"      ON staff            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_pricelist"  ON price_list       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_quotes"     ON quotes           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_lines"      ON quote_line_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public read for shareable quote view (unauthenticated)
CREATE POLICY "public_read_quotes"  ON quotes           FOR SELECT TO anon USING (true);
CREATE POLICY "public_read_lines"   ON quote_line_items FOR SELECT TO anon USING (true);

-- ──────────────────────────────────────────────────────────────
-- 8. INDEXES
-- ──────────────────────────────────────────────────────────────
CREATE INDEX idx_quotes_status      ON quotes(status);
CREATE INDEX idx_quotes_quoted_by   ON quotes(quoted_by_id);
CREATE INDEX idx_quotes_date        ON quotes(quote_date DESC);
CREATE INDEX idx_lines_quote_id     ON quote_line_items(quote_id);
CREATE INDEX idx_pricelist_lookup   ON price_list(grade, distance_band, pump_required) WHERE active = true;
