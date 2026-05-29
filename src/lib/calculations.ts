// ============================================================
// Rhombus Concrete — Quote Calculation Logic
// ============================================================
// Formula (verified against sample_quote.xlsx):
//   line_subtotal = qty × (unit_price + transport + pumping + vat_levy)
//   vat_amount    = line_subtotal × 0.16
//   line_total    = line_subtotal + vat_amount
// ============================================================

import type { LineItemForm, LineCalc, QuoteTotals } from '@/types'

export const VAT_RATE = 0.16
export const DEFAULT_VAT_LEVY = 550

export function calcLine(item: Pick<LineItemForm, 'qty' | 'unit_price' | 'transport' | 'pumping' | 'vat_levy'>): LineCalc {
  const perUnit      = item.unit_price + item.transport + item.pumping + item.vat_levy
  const line_subtotal = round2(item.qty * perUnit)
  const vat_amount    = round2(line_subtotal * VAT_RATE)
  const line_total    = round2(line_subtotal + vat_amount)
  return { line_subtotal, vat_amount, line_total }
}

export function calcTotals(items: LineItemForm[]): QuoteTotals {
  let subtotal = 0, total_vat = 0, grand_total = 0
  for (const item of items) {
    const c = calcLine(item)
    subtotal    += c.line_subtotal
    total_vat   += c.vat_amount
    grand_total += c.line_total
  }
  return {
    subtotal:    round2(subtotal),
    total_vat:   round2(total_vat),
    grand_total: round2(grand_total),
  }
}

// Format a number as KSH currency string
export function formatKES(amount: number): string {
  return 'KSH ' + amount.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Compact format for table cells (no KSH prefix)
export function formatNum(amount: number): string {
  return amount.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Generate a temporary client-side UUID for new line items
export function tempId(): string {
  return 'tmp_' + Math.random().toString(36).slice(2, 10)
}

// Build an empty line item with defaults
export function emptyLine(sortOrder: number): LineItemForm {
  return {
    id:          tempId(),
    sort_order:  sortOrder,
    qty:         1,
    description: '',
    unit_price:  0,
    transport:   0,
    pumping:     0,
    vat_levy:    DEFAULT_VAT_LEVY,
  }
}
