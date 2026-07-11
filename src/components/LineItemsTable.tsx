'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { LineItemForm, PriceListEntry, VatRate, PumpConfig, TransportConfig } from '@/types'
import {
  calcLineTotal, formatNum, emptyLine,
  recomputePumpLines, recomputeTransportLine,
  getPumpMobFee, calcTransportUnitPrice,
} from '@/lib/calculations'

interface Props {
  items:           LineItemForm[]
  priceList:       PriceListEntry[]
  vatRate:         VatRate
  pumpConfig:      PumpConfig
  transportConfig: TransportConfig
  locked:          boolean
  onChange:        (items: LineItemForm[]) => void
}

// ── Number input that allows clearing to empty while typing ─
function NumInput({
  value, onChange, className = '', min = 0, step = 1, disabled = false, placeholder = '0'
}: {
  value: number
  onChange: (v: number) => void
  className?: string
  min?: number
  step?: number
  disabled?: boolean
  placeholder?: string
}) {
  const [raw, setRaw] = useState(value === 0 ? '' : String(value))

  // Sync from outside only when value actually changed and input not focused
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) {
      setRaw(value === 0 ? '' : String(value))
    }
  }, [value])

  return (
    <input
      type="number"
      min={min}
      step={step}
      disabled={disabled}
      placeholder={placeholder}
      value={raw}
      className={className}
      onFocus={() => { focused.current = true }}
      onBlur={() => {
        focused.current = false
        const parsed = parseFloat(raw)
        const final  = isNaN(parsed) ? 0 : parsed
        setRaw(final === 0 ? '' : String(final))
        onChange(final)
      }}
      onChange={e => {
        setRaw(e.target.value)
        const parsed = parseFloat(e.target.value)
        if (!isNaN(parsed)) onChange(parsed)
      }}
    />
  )
}

// ── Grade search with portal dropdown ───────────────────────
function GradeSearch({ priceList, value, onSelect, disabled }: {
  priceList: PriceListEntry[]
  value:     string
  onSelect:  (e: PriceListEntry) => void
  disabled:  boolean
}) {
  const [query,   setQuery]   = useState('')
  const [open,    setOpen]    = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 })
  const inputRef = useRef<HTMLInputElement>(null)

  const reposition = useCallback(() => {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    setDropPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width })
  }, [])

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node
      if (inputRef.current?.contains(target)) return
      if (document.getElementById('grade-search-portal')?.contains(target)) return
      setOpen(false); setQuery('')
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const q        = query.trim().toLowerCase()
  const filtered = q === '' ? priceList : priceList.filter(e =>
    e.grade.toLowerCase().includes(q) ||
    `supply for concrete class ${e.grade.replace('C','').toLowerCase()}`.includes(q)
  )

  const dropdown = open ? createPortal(
    <div id="grade-search-portal" style={{ position: 'absolute', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
      {priceList.length === 0
        ? <p className="px-3 py-2 text-xs text-gray-400">No grades in price list yet</p>
        : filtered.length === 0
          ? <p className="px-3 py-2 text-xs text-gray-400">No match for "{query}"</p>
          : filtered.map(e => (
            <button key={e.id} type="button"
              onMouseDown={ev => { ev.preventDefault(); onSelect(e); setOpen(false); setQuery('') }}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 flex justify-between items-center gap-4 border-b border-gray-50 last:border-0">
              <span className="font-medium text-gray-900">Supply for Concrete Class {e.grade.replace('C', '')}</span>
              <span className="text-xs text-gray-400 shrink-0">KSH {e.unit_price_kes.toLocaleString('en-KE')}/m³</span>
            </button>
          ))
      }
    </div>, document.body
  ) : null

  return (
    <>
      <input ref={inputRef} type="text" disabled={disabled}
        value={open ? query : (value || '')}
        placeholder="Search concrete grade…"
        onFocus={() => { reposition(); setOpen(true); setQuery('') }}
        onChange={e => { setQuery(e.target.value); if (!open) { reposition(); setOpen(true) } }}
        onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery('') } }}
        className="w-full" autoComplete="off" />
      {dropdown}
    </>
  )
}

const TYPE_STYLES: Record<string, string> = {
  concrete:  'bg-blue-100 text-blue-700',
  transport: 'bg-green-100 text-green-700',
  pump:      'bg-amber-100 text-amber-700',
  pump_mob:  'bg-orange-100 text-orange-700',
  other:     'bg-gray-100 text-gray-600',
}

export default function LineItemsTable({ items, priceList, vatRate, pumpConfig, transportConfig, locked, onChange }: Props) {

  function update(updated: LineItemForm[]) { onChange(updated) }

  function updateField(id: string, field: keyof LineItemForm, value: string | number) {
    let updated = items.map(i => i.id === id ? { ...i, [field]: value } : i)
    if (field === 'qty') updated = recomputePumpLines(updated, pumpConfig)
    if (field === 'distance_km') updated = updated.map(i => i.id === id ? recomputeTransportLine(i, transportConfig) : i)
    update(updated)
  }

  function changeType(id: string, newType: LineItemForm['item_type']) {
    let updated = items.map(item => {
      if (item.id !== id) return item
      const base: LineItemForm = {
        ...item, item_type: newType,
        description: newType === 'transport' ? 'Transport'
                   : newType === 'pump'      ? 'Pumping'
                   : newType === 'other'     ? '' : item.description,
        unit:        newType === 'transport' ? 'm³'
                   : newType === 'pump'      ? 'm³'
                   : newType === 'concrete'  ? 'm³' : 'lot',
        unit_price: 0, distance_km: 0,
      }
      if (newType === 'transport') return recomputeTransportLine(base, transportConfig)
      return base
    })
    updated = recomputePumpLines(updated, pumpConfig)
    update(updated)
  }

  function handleGradeSelect(id: string, entry: PriceListEntry) {
    const updated = items.map(i =>
      i.id === id
        ? { ...i, description: `Supply for Concrete Class ${entry.grade.replace('C','')}`, unit_price: entry.unit_price_kes, unit: 'm³' }
        : i
    )
    update(updated)
  }

  function addLine() { update([...items, emptyLine(items.length)]) }

  function removeLine(id: string) {
    update(recomputePumpLines(items.filter(i => i.id !== id), pumpConfig))
  }

  const totalConcreteM3 = items.filter(i => i.item_type === 'concrete').reduce((s, i) => s + i.qty, 0)
  const mobFee          = getPumpMobFee(totalConcreteM3, pumpConfig)
  const pumpLines       = items.filter(i => i.item_type === 'pump')

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-28">Type</th>
              <th className="px-2 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase w-20">Qty (m³)</th>
              <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-14">Unit</th>
              <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
              <th className="px-2 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase w-36">Unit rate (KSH)</th>
              <th className="px-2 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase w-32">Amount (KSH)</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => {
              const isPump     = item.item_type === 'pump'
              const isMob      = item.item_type === 'pump_mob'
              const isTrans    = item.item_type === 'transport'
              const isConcrete = item.item_type === 'concrete'
              // Transport and pump use totalConcreteM3 as effective qty
              const effectiveQty = (isTrans || isPump) ? totalConcreteM3 : item.qty
              const lineTotal    = calcLineTotal({ qty: effectiveQty, unit_price: item.unit_price })

              return (
                <tr key={item.id} className="hover:bg-blue-50/20 group transition-colors align-top">

                  {/* Type — pump_mob always read-only badge */}
                  <td className="px-2 py-2">
                    {(locked || isMob) ? (
                      <span className={`text-xs font-semibold px-2 py-1 rounded-md ${TYPE_STYLES[item.item_type]}`}>
                        {isMob ? 'Mob fee' : item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1)}
                      </span>
                    ) : (
                      <select value={item.item_type} onChange={e => changeType(item.id, e.target.value as any)}
                        className={`text-xs font-semibold border-0 rounded-md px-2 py-1.5 cursor-pointer ${TYPE_STYLES[item.item_type]}`}
                        style={{ appearance: 'auto' }}>
                        <option value="concrete">Concrete</option>
                        <option value="transport">Transport</option>
                        <option value="pump">Pump</option>
                        <option value="other">Other</option>
                      </select>
                    )}
                  </td>

                  {/* Qty — read-only for pump, mob, transport (all auto-set to concrete volume) */}
                  <td className="px-2 py-2">
                    {(isMob || isPump || isTrans) ? (
                      <span className="block text-right text-sm text-gray-500 pt-1">
                        {isMob ? item.qty : totalConcreteM3}
                      </span>
                    ) : (
                      <NumInput
                        value={item.qty}
                        step={0.5}
                        disabled={locked}
                        className="text-right w-full"
                        onChange={v => updateField(item.id, 'qty', v)}
                      />
                    )}
                  </td>

                  {/* Unit */}
                  <td className="px-2 py-2">
                    <span className="text-xs text-gray-400 pt-2 block">{item.unit}</span>
                  </td>

                  {/* Description */}
                  <td className="px-2 py-2">
                    {isConcrete && (
                      <GradeSearch priceList={priceList} value={item.description}
                        onSelect={e => handleGradeSelect(item.id, e)} disabled={locked} />
                    )}
                    {isTrans && (
                      <div className="flex flex-col gap-1">
                        <input type="text" value={item.description} disabled={locked}
                          onChange={e => updateField(item.id, 'description', e.target.value)}
                          className="text-xs" placeholder="Transport" />
                        {!locked && (
                          <div className="flex items-center gap-1.5">
                            <NumInput
                              value={item.distance_km}
                              step={1}
                              disabled={locked}
                              className="w-16 text-right text-xs"
                              placeholder="0"
                              onChange={v => updateField(item.id, 'distance_km', v)}
                            />
                            <span className="text-xs text-gray-400">
                              km return trip → KSH {calcTransportUnitPrice(item.distance_km, transportConfig).toLocaleString('en-KE')}/m³
                            </span>
                          </div>
                        )}
                        {locked && item.distance_km > 0 && (
                          <span className="text-xs text-gray-400">{item.distance_km} km return trip</span>
                        )}
                      </div>
                    )}
                    {(isPump || isMob) && (
                      <span className="text-sm text-gray-700">{item.description}</span>
                    )}
                    {item.item_type === 'other' && (
                      <input type="text" value={item.description} disabled={locked}
                        onChange={e => updateField(item.id, 'description', e.target.value)}
                        className="w-full" placeholder="Description…" />
                    )}
                  </td>

                  {/* Unit rate
                      - Transport / mob fee: read-only plain text (auto-calculated)
                      - Concrete / pump / other: editable (allows per-quote discount)
                      - All locked when quote is confirmed/invoiced */}
                  <td className="px-2 py-2">
                    {(isTrans || isMob) ? (
                      <span className="block text-right font-mono text-xs text-gray-500 tabular-nums pt-1.5">
                        {formatNum(item.unit_price)}
                      </span>
                    ) : (
                      <div className="flex flex-col items-end gap-0.5">
                        <NumInput
                          value={item.unit_price}
                          step={1}
                          disabled={locked}
                          className="text-right w-full"
                          onChange={v => updateField(item.id, 'unit_price', v)}
                        />
                        {/* Show list price hint if discounted */}
                        {isConcrete && (() => {
                          const listPrice = priceList.find(e =>
                            `Supply for Concrete Class ${e.grade.replace('C','')}` === item.description
                          )?.unit_price_kes
                          if (listPrice && item.unit_price !== listPrice) {
                            return (
                              <span className="text-xs text-amber-600">
                                List: {listPrice.toLocaleString('en-KE')}
                              </span>
                            )
                          }
                        })()}
                        {isPump && item.unit_price !== pumpConfig.pump_rate_per_m3 && (
                          <span className="text-xs text-amber-600">
                            List: {pumpConfig.pump_rate_per_m3.toLocaleString('en-KE')}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="px-2 py-2 text-right font-semibold font-mono text-xs tabular-nums pt-3">
                    {formatNum(lineTotal)}
                  </td>

                  {/* Delete — hidden for mob fee rows */}
                  <td className="px-2 py-2 text-center pt-3">
                    {!locked && !isMob && (
                      <button onClick={() => removeLine(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xl leading-none">
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pump info bar */}
      {pumpLines.length > 0 && (
        <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex flex-wrap gap-x-4 gap-y-1">
          <span className="font-semibold">🚛 Pump</span>
          <span>{totalConcreteM3} m³ × KSH {pumpConfig.pump_rate_per_m3.toLocaleString('en-KE')}/m³</span>
          {mobFee > 0
            ? <span>Mob fee: KSH {mobFee.toLocaleString('en-KE')} ({
                totalConcreteM3 <= 10 ? '0–10' : totalConcreteM3 <= 20 ? '11–20' :
                totalConcreteM3 <= 30 ? '21–30' : totalConcreteM3 <= 40 ? '31–40' : '41–49'
              } m³ bracket) — auto-added</span>
            : <span className="text-green-700">✓ No mob fee (≥50 m³)</span>
          }
        </div>
      )}

      {!locked && (
        <div className="mt-4 flex items-center gap-4">
          <button onClick={addLine} className="btn text-rhombus-blue border-blue-200 hover:bg-blue-50 hover:border-rhombus-blue">
            + Add line
          </button>
          {items.length === 0 && (
            <span className="text-xs text-gray-400">Click "+ Add line" to begin</span>
          )}
        </div>
      )}
    </div>
  )
}
