-- ============================================================
-- Rhombus Concrete — Seed Data (run AFTER schema.sql)
-- ============================================================

-- STAFF
INSERT INTO staff (name, role) VALUES
  ('Martin Miriti',    'sales_manager'),
  ('Faith Kamau',      'sales_admin'),
  ('Eugene Hilary',    'it_admin'),
  ('Pauline Wanjiru',  'kam'),
  ('Peterson Miano',   'kam');

-- CONCRETE PRICES (update to current before go-live)
INSERT INTO price_list (grade, unit_price_kes) VALUES
  ('C15',  8300),
  ('C20',  9300),
  ('C25', 10400),
  ('C30', 11000),
  ('C35', 13000),
  ('C40', 13500);

-- PRICING CONFIG — Herman's transport formula + pump constants
INSERT INTO pricing_config (key, value, label) VALUES
  -- Transport pricing constants
  ('fuel_price_per_litre', 232,    'Fuel price per litre (KSH) — update when fuel price changes'),
  ('km_per_litre',         1.3,    'Truck fuel efficiency (km per litre)'),
  ('fuel_divisor',         6,      'Fuel calculation divisor (internal constant — do not change unless advised)'),
  ('truck_fixed_per_trip', 11618,  'Daily truck fixed cost KSH (depreciation + insurance + R&M + driver + tyres)'),
  ('m3_per_load',          7,      'Cubic metres per load'),
  -- Pump
  ('pump_rate_per_m3',     650,    'Pump charge per m³ (KSH)'),
  ('mob_0_10',             50000,  'Pump mob fee — 0 to 10 m³'),
  ('mob_11_20',            40000,  'Pump mob fee — 11 to 20 m³'),
  ('mob_21_30',            30000,  'Pump mob fee — 21 to 30 m³'),
  ('mob_31_40',            25000,  'Pump mob fee — 31 to 40 m³'),
  ('mob_41_49',            20000,  'Pump mob fee — 41 to 49 m³');

-- BANK ACCOUNTS
INSERT INTO bank_accounts (name, account_name, account_number, paybill, bank, branch, swift_code, is_default) VALUES
  ('SBM Bank', 'Rhombus Concrete Ltd', '0692386490001', '552800', 'SBM Bank', 'Lenana Road', 'SBMKKENA', true),
  ('NCBA',     'Rhombus Concrete Ltd', '',              '',       'NCBA Bank', '',           '',         false),
  ('Petty Cash', null,                  null,            null,     null,        null,          null,       false);

-- COMPANY CONFIG
INSERT INTO company_config (key, value) VALUES
  ('phone',   '+254-702-700-700 / +254-705-900-000'),
  ('address', 'Rhombus HQ, Tara Road off Kiambu Road, Nairobi'),
  ('email',   'info@rhombusconcrete.com');
