// ============================================================
// Rhombus Concrete — Quote Calculation Logic
// ============================================================
// Line item formula:
//   line_total = qty × unit_price
//
// Transport:
//   unit_price = distance_km / km_per_litre × fuel_price / fuel_divisor
//   Note: distance_km is the FULL RETURN TRIP distance (not one-way)
//
// Pump:
//   unit_price = pump_rate_per_m3
//   qty        = total concrete m³ on the quote
//
// Pump mobilisation (separate line item):
//   qty        = 1
//   unit_price = bracket lookup by total concrete m³:
//     0–10  → mob_0_10  |  11–20 → mob_11_20  |  21–30 → mob_21_30
//     31–40 → mob_31_40 |  41–49 → mob_41_49  |  50+   → 0 (no fee)
//
// Quote totals:
//   subtotal    = SUM(line_total)
//   total_vat   = subtotal × vat_rate
//   grand_total = subtotal + total_vat
// ============================================================

import type {
  LineItemForm, QuoteTotals, VatRate,
  PumpConfig, TransportConfig,
} from '@/types'
import { DEFAULT_PUMP_CONFIG, DEFAULT_TRANSPORT_CONFIG } from '@/types'

export const DEFAULT_VAT_RATE: VatRate = 0.16

// ── Pump mob fee lookup ──────────────────────────────────────
export function getPumpMobFee(totalConcreteM3: number, cfg: PumpConfig = DEFAULT_PUMP_CONFIG): number {
  if (totalConcreteM3 <= 0)  return 0
  if (totalConcreteM3 <= 10) return cfg.mob_0_10
  if (totalConcreteM3 <= 20) return cfg.mob_11_20
  if (totalConcreteM3 <= 30) return cfg.mob_21_30
  if (totalConcreteM3 <= 40) return cfg.mob_31_40
  if (totalConcreteM3 <  50) return cfg.mob_41_49
  return 0
}

// ── Transport unit price per m³ ─────────────────────────────
// distance_km = full return trip distance entered by user
// unit_price  = distance_km / km_per_litre × fuel_price / fuel_divisor
export function calcTransportUnitPrice(
  distanceKm: number,
  cfg: TransportConfig = DEFAULT_TRANSPORT_CONFIG
): number {
  return round2((distanceKm / cfg.km_per_litre * cfg.fuel_price_per_litre) / cfg.fuel_divisor)
}

// ── Single line total ────────────────────────────────────────
export function calcLineTotal(item: Pick<LineItemForm, 'qty' | 'unit_price'>): number {
  return round2(item.qty * item.unit_price)
}

// ── Quote totals ─────────────────────────────────────────────
export function calcTotals(items: LineItemForm[], vatRate: VatRate = DEFAULT_VAT_RATE): QuoteTotals {
  const totalConcreteM3 = items.filter(i => i.item_type === 'concrete').reduce((s, i) => s + i.qty, 0)
  const subtotal = round2(items.reduce((s, i) => {
    const qty = (i.item_type === 'transport' || i.item_type === 'pump') ? totalConcreteM3 : i.qty
    return s + round2(qty * i.unit_price)
  }, 0))
  const total_vat   = round2(subtotal * vatRate)
  const grand_total = round2(subtotal + total_vat)
  return { subtotal, total_vat, grand_total }
}

// ── Recompute pump + auto-manage mob fee line ───────────────
// Rules:
//  - pump qty  = total concrete m³
//  - pump_mob  = auto-inserted after first pump line when concrete < 50 m³
//                auto-removed when concrete >= 50 m³ or no pump lines
export function recomputePumpLines(
  items: LineItemForm[],
  pumpCfg: PumpConfig = DEFAULT_PUMP_CONFIG
): LineItemForm[] {
  const totalConcreteM3 = items
    .filter(i => i.item_type === 'concrete')
    .reduce((s, i) => s + i.qty, 0)

  const hasPump   = items.some(i => i.item_type === 'pump')
  const mobFee    = hasPump ? getPumpMobFee(totalConcreteM3, pumpCfg) : 0
  const hasMobRow = items.some(i => i.item_type === 'pump_mob')

  // Update pump, mob fee, and transport qty to concrete volume
  let result = items.map(item => {
    if (item.item_type === 'pump') {
      return { ...item, qty: totalConcreteM3, unit_price: item.unit_price || pumpCfg.pump_rate_per_m3, unit: 'm³' }
    }
    if (item.item_type === 'pump_mob') {
      return { ...item, qty: 1, unit_price: mobFee, unit: 'm³' }
    }
    if (item.item_type === 'transport') {
      return { ...item, qty: totalConcreteM3 }
    }
    return item
  })

  // Auto-insert mob fee row after first pump line if needed
  if (hasPump && mobFee > 0 && !hasMobRow) {
    const pumpIdx = result.findIndex(i => i.item_type === 'pump')
    const mobRow: LineItemForm = {
      id:          tempId(),
      sort_order:  pumpIdx + 1,
      item_type:   'pump_mob',
      qty:         1,
      unit:        'm³',
      description: 'Pump mobilization',
      unit_price:  mobFee,
      distance_km: 0,
    }
    result = [...result.slice(0, pumpIdx + 1), mobRow, ...result.slice(pumpIdx + 1)]
  }

  // Auto-remove mob fee row if no pump or mob fee is 0 (>=50 m³)
  if (!hasPump || mobFee === 0) {
    result = result.filter(i => i.item_type !== 'pump_mob')
  }

  return result
}

// ── Recompute transport line ─────────────────────────────────
export function recomputeTransportLine(
  item: LineItemForm,
  cfg: TransportConfig = DEFAULT_TRANSPORT_CONFIG
): LineItemForm {
  if (item.item_type !== 'transport') return item
  return { ...item, unit_price: calcTransportUnitPrice(item.distance_km, cfg) }
}

// ── Format helpers ───────────────────────────────────────────
export function formatKES(amount: number): string {
  return 'KSH ' + amount.toLocaleString('en-KE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })
}

export function formatNum(amount: number): string {
  return amount.toLocaleString('en-KE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function tempId(): string {
  return 'tmp_' + Math.random().toString(36).slice(2, 10)
}

export function emptyLine(sortOrder: number): LineItemForm {
  return {
    id:          tempId(),
    sort_order:  sortOrder,
    item_type:   'concrete',
    qty:         1,
    unit:        'm³',
    description: '',
    unit_price:  0,
    distance_km: 0,
  }
}
