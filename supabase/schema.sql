-- ============================================================
-- Rhombus Concrete Quotation App — Schema v4
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. STAFF
CREATE TABLE staff (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT UNIQUE,
  role       TEXT NOT NULL DEFAULT 'kam'
               CHECK (role IN ('kam', 'sales_admin', 'sales_manager', 'it_admin')),
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. PRICE LIST
CREATE TABLE price_list (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade          TEXT NOT NULL CHECK (grade IN ('C15','C20','C25','C30','C35','C40')),
  unit_price_kes NUMERIC(12,2) NOT NULL,
  valid_from     DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to       DATE,
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (grade)
);

-- 3. PRICING CONFIG — transport (Herman formula) + pump constants
CREATE TABLE pricing_config (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT UNIQUE NOT NULL,
  value      NUMERIC(14,4) NOT NULL,
  label      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. BANK ACCOUNTS
CREATE TABLE bank_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,           -- display name e.g. "SBM Bank", "NCBA", "Petty Cash"
  account_name   TEXT,
  account_number TEXT,
  paybill        TEXT,
  bank           TEXT,
  branch         TEXT,
  swift_code     TEXT,
  is_default     BOOLEAN NOT NULL DEFAULT false,
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. COMPANY CONFIG
CREATE TABLE company_config (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key   TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL DEFAULT ''
);

-- 6. QUOTES
CREATE TABLE quotes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_number            TEXT UNIQUE NOT NULL,
  invoice_number       TEXT,
  status               TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','sent','confirmed','invoiced')),
  quoted_by_id         UUID REFERENCES staff(id),
  quoted_by_name       TEXT NOT NULL,
  client_name          TEXT NOT NULL,
  cc                   TEXT,
  site                 TEXT NOT NULL,
  subject              TEXT NOT NULL DEFAULT 'Quotation for the supply of Ready Mix Concrete',
  quote_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  sap_quote_no         TEXT,
  sap_so_no            TEXT,
  odoo_opportunity_ref TEXT,
  vat_rate             NUMERIC(5,4) NOT NULL DEFAULT 0.16,
  bank_account_id      UUID REFERENCES bank_accounts(id),
  subtotal             NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_vat            NUMERIC(14,2) NOT NULL DEFAULT 0,
  grand_total          NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. QUOTE LINE ITEMS
CREATE TABLE quote_line_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  item_type   TEXT NOT NULL DEFAULT 'concrete'
                CHECK (item_type IN ('concrete','transport','pump','pump_mob','other')),
  qty         NUMERIC(10,2) NOT NULL,
  unit        TEXT NOT NULL DEFAULT 'm³',
  description TEXT NOT NULL,
  unit_price  NUMERIC(12,2) NOT NULL,
  distance_km NUMERIC(10,2),
  line_total  NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. PI NUMBER
CREATE SEQUENCE pi_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_pi_number() RETURNS TEXT AS $$
DECLARE seq_val INT; yr TEXT; mo TEXT;
BEGIN
  seq_val := nextval('pi_number_seq');
  yr := TO_CHAR(NOW(), 'YYYY'); mo := TO_CHAR(NOW(), 'MM');
  RETURN 'RCL/' || yr || '/' || mo || '/' || LPAD(seq_val::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- 9. TRIGGERS

CREATE OR REPLACE FUNCTION set_pi_number() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pi_number IS NULL OR NEW.pi_number = '' THEN NEW.pi_number := generate_pi_number(); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_set_pi_number BEFORE INSERT ON quotes FOR EACH ROW EXECUTE FUNCTION set_pi_number();

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE FUNCTION recalc_quote_totals() RETURNS TRIGGER AS $$
DECLARE q_id UUID;
BEGIN
  q_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.quote_id ELSE NEW.quote_id END;
  UPDATE quotes SET
    subtotal    = COALESCE((SELECT SUM(line_total) FROM quote_line_items WHERE quote_id = q_id), 0),
    total_vat   = COALESCE((SELECT SUM(line_total) FROM quote_line_items WHERE quote_id = q_id), 0) * vat_rate,
    grand_total = COALESCE((SELECT SUM(line_total) FROM quote_line_items WHERE quote_id = q_id), 0) * (1 + vat_rate),
    updated_at  = now()
  WHERE id = q_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_recalc_on_line_change
  AFTER INSERT OR UPDATE OR DELETE ON quote_line_items
  FOR EACH ROW EXECUTE FUNCTION recalc_quote_totals();

-- 10. RLS
ALTER TABLE staff            ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON staff            FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON price_list       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON pricing_config   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON bank_accounts    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON company_config   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON quotes           FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON quote_line_items FOR ALL TO anon USING (true) WITH CHECK (true);

-- 11. INDEXES
CREATE INDEX idx_quotes_status    ON quotes(status);
CREATE INDEX idx_quotes_date      ON quotes(quote_date DESC);
CREATE INDEX idx_lines_quote_id   ON quote_line_items(quote_id);
CREATE INDEX idx_pricelist_grade  ON price_list(grade) WHERE active = true;
