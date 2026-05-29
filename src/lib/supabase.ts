import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnon)

// ── Typed query helpers ──────────────────────────────────────

import type { Quote, QuoteLineItem, Staff, PriceListEntry, QuoteForm, LineItemForm } from '@/types'

// Fetch a single quote with its line items
export async function fetchQuote(id: string): Promise<Quote | null> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, line_items:quote_line_items(*)')
    .eq('id', id)
    .order('sort_order', { referencedTable: 'quote_line_items' })
    .single()

  if (error) { console.error('fetchQuote:', error); return null }
  return data as Quote
}

// Fetch all quotes (dashboard list)
export async function fetchQuotes(): Promise<Quote[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select('id,pi_number,invoice_number,status,quoted_by_name,client_name,site,quote_date,grand_total,updated_at')
    .order('created_at', { ascending: false })

  if (error) { console.error('fetchQuotes:', error); return [] }
  return data as Quote[]
}

// Fetch all active staff for the "Quoted by" dropdown
export async function fetchStaff(): Promise<Staff[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('active', true)
    .order('name')

  if (error) { console.error('fetchStaff:', error); return [] }
  return data as Staff[]
}

// Fetch active price list
export async function fetchPriceList(): Promise<PriceListEntry[]> {
  const { data, error } = await supabase
    .from('price_list')
    .select('*')
    .eq('active', true)
    .order('grade')
    .order('distance_band')
    .order('pump_required')

  if (error) { console.error('fetchPriceList:', error); return [] }
  return data as PriceListEntry[]
}

// Create a new quote with line items (two-step: create quote → upsert lines)
export async function createQuote(form: QuoteForm): Promise<string | null> {
  const { line_items, ...quoteData } = form

  const { data: quote, error: qErr } = await supabase
    .from('quotes')
    .insert([{
      ...quoteData,
      pi_number: '',   // trigger fills this
    }])
    .select('id')
    .single()

  if (qErr || !quote) { console.error('createQuote:', qErr); return null }

  const lines = buildLineRows(quote.id, line_items)
  const { error: lErr } = await supabase.from('quote_line_items').insert(lines)
  if (lErr) { console.error('createQuote lines:', lErr); return null }

  return quote.id
}

// Update an existing quote and replace its line items
export async function updateQuote(id: string, form: QuoteForm): Promise<boolean> {
  const { line_items, ...quoteData } = form

  const { error: qErr } = await supabase
    .from('quotes')
    .update(quoteData)
    .eq('id', id)

  if (qErr) { console.error('updateQuote:', qErr); return false }

  // Replace all line items
  await supabase.from('quote_line_items').delete().eq('quote_id', id)

  const lines = buildLineRows(id, line_items)
  const { error: lErr } = await supabase.from('quote_line_items').insert(lines)
  if (lErr) { console.error('updateQuote lines:', lErr); return false }

  return true
}

// Update only the status of a quote
export async function updateQuoteStatus(id: string, status: string): Promise<boolean> {
  const { error } = await supabase.from('quotes').update({ status }).eq('id', id)
  if (error) { console.error('updateQuoteStatus:', error); return false }
  return true
}

// ── Private helpers ─────────────────────────────────────────

import { calcLine } from './calculations'

function buildLineRows(quoteId: string, items: LineItemForm[]) {
  return items.map((item, i) => {
    const calc = calcLine(item)
    return {
      quote_id:     quoteId,
      sort_order:   i,
      qty:          item.qty,
      description:  item.description,
      unit_price:   item.unit_price,
      transport:    item.transport,
      pumping:      item.pumping,
      vat_levy:     item.vat_levy,
      line_subtotal: calc.line_subtotal,
      vat_amount:    calc.vat_amount,
      line_total:    calc.line_total,
    }
  })
}
