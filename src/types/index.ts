// ============================================================
// Rhombus Concrete Quotation App — TypeScript Types
// ============================================================

export type QuoteStatus   = 'draft' | 'sent' | 'confirmed' | 'invoiced'
export type StaffRole     = 'kam' | 'sales_admin' | 'sales_manager' | 'it_admin'
// kam = Key Account Manager (was FSO)
export type Grade         = 'C15' | 'C20' | 'C25' | 'C30' | 'C35' | 'C40'
export type VatRate       = 0 | 0.08 | 0.16
export type LineItemType  = 'concrete' | 'transport' | 'pump' | 'pump_mob' | 'other'

// ── Database row types ──────────────────────────────────────

export interface Staff {
  id:         string
  name:       string
  email:      string | null
  role:       StaffRole
  active:     boolean
  created_at: string
}

export interface PriceListEntry {
  id:             string
  grade:          Grade
  unit_price_kes: number
  valid_from:     string
  valid_to:       string | null
  active:         boolean
  created_at:     string
}

// Pricing config — transport and pump constants
export interface PricingConfig {
  id:         string
  key:        string
  value:      number
  label:      string
  updated_at: string
}

// Bank account — selectable per quote
export interface BankAccount {
  id:             string
  name:           string   // e.g. "SBM Bank", "NCBA", "Petty Cash"
  account_name:   string | null
  account_number: string | null
  paybill:        string | null
  bank:           string | null
  branch:         string | null
  swift_code:     string | null
  is_default:     boolean
  active:         boolean
  created_at:     string
}

// Company config — phone, address, etc.
export interface CompanyConfig {
  id:    string
  key:   string
  value: string
}

export interface Quote {
  id:                   string
  pi_number:            string
  invoice_number:       string | null
  status:               QuoteStatus
  quoted_by_id:         string | null
  quoted_by_name:       string
  client_name:          string
  cc:                   string | null
  site:                 string
  subject:              string
  quote_date:           string
  sap_quote_no:         string | null
  sap_so_no:            string | null
  odoo_opportunity_ref: string | null
  subtotal:             number
  total_vat:            number
  grand_total:          number
  vat_rate:             VatRate
  bank_account_id:      string | null
  notes:                string | null
  created_at:           string
  updated_at:           string
  line_items?:          QuoteLineItem[]
  bank_account?:        BankAccount | null
}

export interface QuoteLineItem {
  id:            string
  quote_id:      string
  sort_order:    number
  item_type:     LineItemType
  qty:           number
  unit:          string   // 'm³', 'lot', 'trip', etc.
  description:   string
  unit_price:    number
  line_total:    number
  // transport extras
  distance_km:   number | null
  created_at:    string
}

// ── Form / UI types ─────────────────────────────────────────

export interface LineItemForm {
  id:          string
  sort_order:  number
  item_type:   LineItemType
  qty:         number
  unit:        string
  description: string
  unit_price:  number
  // transport only
  distance_km: number
}

export interface QuoteForm {
  quoted_by_id:         string
  quoted_by_name:       string
  client_name:          string
  cc:                   string
  site:                 string
  subject:              string
  quote_date:           string
  sap_quote_no:         string
  sap_so_no:            string
  odoo_opportunity_ref: string
  notes:                string
  vat_rate:             VatRate
  bank_account_id:      string
  line_items:           LineItemForm[]
}

// Transport config
export interface TransportConfig {
  fuel_price_per_litre: number   // KSH/litre — update when fuel price changes
  km_per_litre:         number   // truck fuel efficiency
  fuel_divisor:         number   // internal constant (default 6)
}

// Pump config
export interface PumpConfig {
  pump_rate_per_m3: number
  mob_0_10:         number
  mob_11_20:        number
  mob_21_30:        number
  mob_31_40:        number
  mob_41_49:        number
}

// ── Calculation result ───────────────────────────────────────

export interface LineCalc {
  line_total: number
}

export interface QuoteTotals {
  subtotal:    number
  total_vat:   number
  grand_total: number
}

// ── Constants ───────────────────────────────────────────────

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft:     'Draft',
  sent:      'Quotation sent',
  confirmed: 'Order confirmed',
  invoiced:  'Invoiced',
}

export const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft:     'bg-gray-100 text-gray-600',
  sent:      'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  invoiced:  'bg-purple-100 text-purple-700',
}

export const ROLE_LABELS: Record<StaffRole, string> = {
  kam:           'Key Account Manager',
  sales_admin:   'Sales Admin',
  sales_manager: 'Sales Manager',
  it_admin:      'IT Admin',
}

export const GRADE_OPTIONS: Grade[] = ['C15','C20','C25','C30','C35','C40']
export const STATUS_FLOW: QuoteStatus[] = ['draft', 'sent', 'confirmed', 'invoiced']
export const LOCKED_STATUSES: QuoteStatus[] = ['confirmed', 'invoiced']

// Standard terms pre-filled into a new quote's notes; editable per quote.
// Shown on the invoice view and PDF (falls back to this when a quote has no notes).
export const DEFAULT_TERMS = `NB: THE PAYMENT TERMS ARE 100% UPFRONT BEFORE DELIVERY.
NB: PLEASE NOTE THAT VOLUMES BELOW 50M³ ATTRACT A MOBILIZATION FEE BETWEEN 25,000–70,000 KSH.`

export const VAT_RATE_OPTIONS: { label: string; value: VatRate }[] = [
  { label: '16%', value: 0.16 },
  { label: '8%',  value: 0.08 },
  { label: '0%',  value: 0    },
]

export const DEFAULT_PUMP_CONFIG: PumpConfig = {
  pump_rate_per_m3: 650,
  mob_0_10:  50000,
  mob_11_20: 40000,
  mob_21_30: 30000,
  mob_31_40: 25000,
  mob_41_49: 20000,
}

export const DEFAULT_TRANSPORT_CONFIG: TransportConfig = {
  fuel_price_per_litre: 232,
  km_per_litre:         1.3,
  fuel_divisor:         6,
}
