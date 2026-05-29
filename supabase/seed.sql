-- ============================================================
-- Rhombus Concrete — Seed Data
-- Run AFTER schema.sql
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- STAFF — Sales team from the Odoo setup guide
-- Add remaining 13 FSO names as supplied by management
-- ──────────────────────────────────────────────────────────────
INSERT INTO staff (name, role) VALUES
  ('Martin Miriti',    'sales_manager'),
  ('Faith Kamau',      'sales_admin'),
  ('Eugene Hilary',    'it_admin'),
  ('Pauline Wanjiru',  'fso'),
  ('Peterson Miano',   'fso');
-- TODO: add remaining 13 FSOs here

-- ──────────────────────────────────────────────────────────────
-- PRICE LIST — 48 combinations (Grade × Distance × Pump)
-- Prices are PLACEHOLDERS — Sales Admin must update before go-live
-- Structure mirrors Odoo Section 9 Option A
-- ──────────────────────────────────────────────────────────────
INSERT INTO price_list (grade, distance_band, pump_required, unit_price_kes) VALUES
-- C15
('C15','0-10km',  false,  8400), ('C15','0-10km',  true,   9500),
('C15','10-25km', false,  8900), ('C15','10-25km', true,  10000),
('C15','25-50km', false,  9400), ('C15','25-50km', true,  10500),
('C15','50+km',   false,  9900), ('C15','50+km',   true,  11000),
-- C20
('C20','0-10km',  false,  9300), ('C20','0-10km',  true,  10400),
('C20','10-25km', false,  9800), ('C20','10-25km', true,  10900),
('C20','25-50km', false, 10300), ('C20','25-50km', true,  11400),
('C20','50+km',   false, 10800), ('C20','50+km',   true,  11900),
-- C25
('C25','0-10km',  false,  9800), ('C25','0-10km',  true,  10900),
('C25','10-25km', false, 10300), ('C25','10-25km', true,  11400),
('C25','25-50km', false, 10800), ('C25','25-50km', true,  11900),
('C25','50+km',   false, 11300), ('C25','50+km',   true,  12400),
-- C30
('C30','0-10km',  false, 10800), ('C30','0-10km',  true,  11900),
('C30','10-25km', false, 11300), ('C30','10-25km', true,  12400),
('C30','25-50km', false, 11800), ('C30','25-50km', true,  12900),
('C30','50+km',   false, 12300), ('C30','50+km',   true,  13400),
-- C35
('C35','0-10km',  false, 11800), ('C35','0-10km',  true,  12900),
('C35','10-25km', false, 12300), ('C35','10-25km', true,  13400),
('C35','25-50km', false, 12800), ('C35','25-50km', true,  13900),
('C35','50+km',   false, 13300), ('C35','50+km',   true,  14400),
-- C40
('C40','0-10km',  false, 13400), ('C40','0-10km',  true,  14500),
('C40','10-25km', false, 13900), ('C40','10-25km', true,  15000),
('C40','25-50km', false, 14400), ('C40','25-50km', true,  15500),
('C40','50+km',   false, 14900), ('C40','50+km',   true,  16000);
