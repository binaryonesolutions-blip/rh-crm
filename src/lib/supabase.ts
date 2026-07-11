import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnon)

import type {
  Quote, Staff, PriceListEntry, QuoteForm, LineItemForm,
  PumpConfig, TransportConfig, PricingConfig,
  BankAccount, CompanyConfig,
} from '@/types'
import { DEFAULT_PUMP_CONFIG, DEFAULT_TRANSPORT_CONFIG } from '@/types'
import { calcLineTotal } from './calculations'

// ── Quotes ──────────────────────────────────────────────────

export async function fetchQuote(id: string): Promise<Quote | null> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, line_items:quote_line_items(*), bank_account:bank_accounts(*)')
    .eq('id', id)
    .order('sort_order', { referencedTable: 'quote_line_items' })
    .single()
  if (error) { console.error('fetchQuote:', error); return null }
  return data as Quote
}

export async function fetchQuotes(): Promise<Quote[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select('id,pi_number,invoice_number,status,quoted_by_name,client_name,site,quote_date,grand_total,updated_at')
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchQuotes:', error); return [] }
  return data as Quote[]
}

export async function createQuote(form: QuoteForm): Promise<string | null> {
  const { line_items, ...quoteData } = form
  const { data: quote, error: qErr } = await supabase
    .from('quotes')
    .insert([{ ...quoteData, pi_number: '' }])
    .select('id').single()
  if (qErr || !quote) { console.error('createQuote:', qErr); return null }
  const lines = buildLineRows(quote.id, line_items)
  const { error: lErr } = await supabase.from('quote_line_items').insert(lines)
  if (lErr) { console.error('createQuote lines:', lErr); return null }
  return quote.id
}

export async function updateQuote(id: string, form: QuoteForm): Promise<boolean> {
  const { line_items, ...quoteData } = form
  const { error: qErr } = await supabase.from('quotes').update(quoteData).eq('id', id)
  if (qErr) { console.error('updateQuote:', qErr); return false }
  await supabase.from('quote_line_items').delete().eq('quote_id', id)
  const lines = buildLineRows(id, line_items)
  const { error: lErr } = await supabase.from('quote_line_items').insert(lines)
  if (lErr) { console.error('updateQuote lines:', lErr); return false }
  return true
}

export async function updateQuoteStatus(id: string, status: string): Promise<boolean> {
  const { error } = await supabase.from('quotes').update({ status }).eq('id', id)
  if (error) { console.error('updateQuoteStatus:', error); return false }
  return true
}

function buildLineRows(quoteId: string, items: LineItemForm[]) {
  return items.map((item, i) => ({
    quote_id:    quoteId,
    sort_order:  i,
    item_type:   item.item_type,
    qty:         item.qty,
    unit:        item.unit,
    description: item.description,
    unit_price:  item.unit_price,
    distance_km: item.item_type === 'transport' ? item.distance_km : null,
    line_total:  calcLineTotal(item),
  }))
}

// ── Staff ───────────────────────────────────────────────────

export async function fetchStaff(): Promise<Staff[]> {
  const { data, error } = await supabase
    .from('staff').select('*').eq('active', true).order('name')
  if (error) { console.error('fetchStaff:', error); return [] }
  return data as Staff[]
}

// ── Price list ──────────────────────────────────────────────

export async function fetchPriceList(): Promise<PriceListEntry[]> {
  const { data, error } = await supabase
    .from('price_list').select('*').eq('active', true).order('grade')
  if (error) { console.error('fetchPriceList:', error); return [] }
  return data as PriceListEntry[]
}

// ── Pricing config ──────────────────────────────────────────

export async function fetchPricingConfig(): Promise<PricingConfig[]> {
  const { data, error } = await supabase.from('pricing_config').select('*').order('key')
  if (error) { console.error('fetchPricingConfig:', error); return [] }
  return data as PricingConfig[]
}

export function parsePricingConfig(rows: PricingConfig[]): {
  pump: PumpConfig; transport: TransportConfig
} {
  function val(key: string, fallback: number) {
    return rows.find(r => r.key === key)?.value ?? fallback
  }
  return {
    pump: {
      pump_rate_per_m3: val('pump_rate_per_m3', DEFAULT_PUMP_CONFIG.pump_rate_per_m3),
      mob_0_10:         val('mob_0_10',         DEFAULT_PUMP_CONFIG.mob_0_10),
      mob_11_20:        val('mob_11_20',         DEFAULT_PUMP_CONFIG.mob_11_20),
      mob_21_30:        val('mob_21_30',         DEFAULT_PUMP_CONFIG.mob_21_30),
      mob_31_40:        val('mob_31_40',         DEFAULT_PUMP_CONFIG.mob_31_40),
      mob_41_49:        val('mob_41_49',         DEFAULT_PUMP_CONFIG.mob_41_49),
    },
    transport: {
      fuel_price_per_litre: val('fuel_price_per_litre', DEFAULT_TRANSPORT_CONFIG.fuel_price_per_litre),
      km_per_litre:         val('km_per_litre',         DEFAULT_TRANSPORT_CONFIG.km_per_litre),
      fuel_divisor:         val('fuel_divisor',         DEFAULT_TRANSPORT_CONFIG.fuel_divisor),
    },
  }
}

export async function updatePricingConfig(key: string, value: number): Promise<boolean> {
  const { error } = await supabase
    .from('pricing_config')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key)
  if (error) { console.error('updatePricingConfig:', error); return false }
  return true
}

// ── Bank accounts ───────────────────────────────────────────

export async function fetchBankAccounts(): Promise<BankAccount[]> {
  const { data, error } = await supabase
    .from('bank_accounts').select('*').eq('active', true).order('name')
  if (error) { console.error('fetchBankAccounts:', error); return [] }
  return data as BankAccount[]
}

// ── Company config ──────────────────────────────────────────

export async function fetchCompanyConfig(): Promise<CompanyConfig[]> {
  const { data, error } = await supabase.from('company_config').select('*')
  if (error) { console.error('fetchCompanyConfig:', error); return [] }
  return data as CompanyConfig[]
}

export async function updateCompanyConfig(key: string, value: string): Promise<boolean> {
  const { error } = await supabase
    .from('company_config').update({ value }).eq('key', key)
  if (error) { console.error('updateCompanyConfig:', error); return false }
  return true
}
