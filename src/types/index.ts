// ============================================================
// Rhombus Concrete Quotation App — TypeScript Types
// ============================================================

export type QuoteStatus = 'draft' | 'sent' | 'confirmed' | 'invoiced'
export type StaffRole   = 'fso' | 'sales_admin' | 'sales_manager' | 'it_admin'
export type Grade       = 'C15' | 'C20' | 'C25' | 'C30' | 'C35' | 'C40'
export type DistanceBand = '0-10km' | '10-25km' | '25-50km' | '50+km'

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
  distance_band:  DistanceBand
  pump_required:  boolean
  unit_price_kes: number
  valid_from:     string
  valid_to:       string | null
  active:         boolean
  created_at:     string
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
  notes:                string | null
  created_at:           string
  updated_at:           string
  // Joined
  line_items?:          QuoteLineItem[]
}

export interface QuoteLineItem {
  id:            string
  quote_id:      string
  sort_order:    number
  qty:           number
  description:   string
  unit_price:    number
  transport:     number
  pumping:       number
  vat_levy:      number
  line_subtotal: number
  vat_amount:    number
  line_total:    number
  created_at:    string
}

// ── Form / UI types ─────────────────────────────────────────

export interface LineItemForm {
  id:          string   // local UUID (before save)
  sort_order:  number
  qty:         number
  description: string
  unit_price:  number
  transport:   number
  pumping:     number
  vat_levy:    number
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
  line_items:           LineItemForm[]
}

// ── Calculation result ───────────────────────────────────────

export interface LineCalc {
  line_subtotal: number   // qty * (unit + transport + pumping + vat_levy)
  vat_amount:    number   // line_subtotal * 0.16
  line_total:    number   // line_subtotal + vat_amount
}

export interface QuoteTotals {
  subtotal:    number
  total_vat:   number
  grand_total: number
}

// ── Status display helpers ───────────────────────────────────

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

export const GRADE_OPTIONS: Grade[] = ['C15','C20','C25','C30','C35','C40']

export const DISTANCE_BAND_OPTIONS: DistanceBand[] = [
  '0-10km', '10-25km', '25-50km', '50+km'
]

export const STATUS_FLOW: QuoteStatus[] = [
  'draft', 'sent', 'confirmed', 'invoiced'
]
