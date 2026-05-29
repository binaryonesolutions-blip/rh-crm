'use client'

import { useState } from 'react'
import type { LineItemForm, PriceListEntry } from '@/types'
import { calcLine, formatNum, emptyLine } from '@/lib/calculations'

interface Props {
  items:     LineItemForm[]
  priceList: PriceListEntry[]
  onChange:  (items: LineItemForm[]) => void
}

/** Human-readable label for a price list entry */
function entryLabel(e: PriceListEntry) {
  return `Concrete ${e.grade} – ${e.distance_band}${e.pump_required ? ' (with pump)' : ''}`
}

const CUSTOM_KEY = '__custom__'

export default function LineItemsTable({ items, priceList, onChange }: Props) {
  // Track which rows are in free-text (custom) mode
  const [customRows, setCustomRows] = useState<Set<string>>(new Set())

  function isCustom(item: LineItemForm) {
    if (customRows.has(item.id)) return true
    // If current description doesn't match any price list entry, treat as custom
    return item.description !== '' && !priceList.some(e => entryLabel(e) === item.description)
  }

  function setCustomMode(id: string, on: boolean) {
    setCustomRows(prev => {
      const next = new Set(prev)
      on ? next.add(id) : next.delete(id)
      return next
    })
  }

  function update(id: string, field: keyof LineItemForm, value: string | number) {
    onChange(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  function handleDescriptionSelect(item: LineItemForm, value: string) {
    if (value === CUSTOM_KEY) {
      setCustomMode(item.id, true)
      update(item.id, 'description', '')
      return
    }
    const entry = priceList.find(e => e.id === value)
    if (!entry) return
    // Auto-fill description + unit price from price list
    onChange(items.map(i =>
      i.id === item.id
        ? { ...i, description: entryLabel(entry), unit_price: entry.unit_price_kes }
        : i
    ))
    setCustomMode(item.id, false)
  }

  function addLine() {
    onChange([...items, emptyLine(items.length)])
  }

  function removeLine(id: string) {
    onChange(items.filter(item => item.id !== id))
    setCustomRows(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  // Find which price list entry matches a description (for select value)
  function matchedEntryId(description: string) {
    return priceList.find(e => entryLabel(e) === description)?.id ?? ''
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-20">Qty (M³)</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Description</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide w-28">Unit price</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide w-24">Transport</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide w-24">Pumping</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide w-24">VAT levy</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide w-28">VAT (16%)</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide w-32">Line total</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item) => {
              const calc = calcLine(item)
              const custom = isCustom(item)

              return (
                <tr key={item.id} className="hover:bg-blue-50/30 group transition-colors">
                  {/* Qty */}
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={item.qty}
                      onChange={e => update(item.id, 'qty', parseFloat(e.target.value) || 0)}
                      className="text-center"
                    />
                  </td>

                  {/* Description — dropdown or free text */}
                  <td className="px-2 py-2">
                    {custom ? (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={item.description}
                          placeholder="Enter custom description…"
                          onChange={e => update(item.id, 'description', e.target.value)}
                        />
                        <button
                          title="Pick from price list"
                          onClick={() => setCustomMode(item.id, false)}
                          className="shrink-0 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-rhombus-blue text-gray-400 hover:text-rhombus-blue transition-colors"
                        >
                          ☰
                        </button>
                      </div>
                    ) : (
                      <select
                        value={matchedEntryId(item.description)}
                        onChange={e => handleDescriptionSelect(item, e.target.value)}
                        className="w-full"
                      >
                        <option value="">— Select concrete grade —</option>
                        {priceList.map(e => (
                          <option key={e.id} value={e.id}>
                            {entryLabel(e)} — KSH {e.unit_price_kes.toLocaleString('en-KE')}/m³
                          </option>
                        ))}
                        <option value={CUSTOM_KEY}>✏ Custom description…</option>
                      </select>
                    )}
                  </td>

                  {/* Unit price */}
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      value={item.unit_price}
                      onChange={e => update(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="text-right"
                    />
                  </td>

                  {/* Transport */}
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      value={item.transport}
                      onChange={e => update(item.id, 'transport', parseFloat(e.target.value) || 0)}
                      className="text-right"
                    />
                  </td>

                  {/* Pumping */}
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      value={item.pumping}
                      onChange={e => update(item.id, 'pumping', parseFloat(e.target.value) || 0)}
                      className="text-right"
                    />
                  </td>

                  {/* VAT levy */}
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      value={item.vat_levy}
                      onChange={e => update(item.id, 'vat_levy', parseFloat(e.target.value) || 0)}
                      className="text-right"
                    />
                  </td>

                  {/* VAT amount (read-only) */}
                  <td className="px-3 py-2 text-right text-gray-400 font-mono text-xs tabular-nums">
                    {formatNum(calc.vat_amount)}
                  </td>

                  {/* Line total (read-only) */}
                  <td className="px-3 py-2 text-right font-semibold text-gray-900 font-mono text-xs tabular-nums">
                    {formatNum(calc.line_total)}
                  </td>

                  {/* Delete */}
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => removeLine(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xl leading-none"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <button onClick={addLine} className="btn text-rhombus-blue border-blue-200 hover:bg-blue-50 hover:border-rhombus-blue">
          + Add line
        </button>
        {items.length === 0 && (
          <span className="text-xs text-gray-400">
            Click "Add line" then select a concrete grade from the dropdown
          </span>
        )}
      </div>
    </div>
  )
}
