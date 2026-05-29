'use client'

import { useState } from 'react'
import type { PriceListEntry, Grade, DistanceBand } from '@/types'
import { GRADE_OPTIONS, DISTANCE_BAND_OPTIONS } from '@/types'

interface Props {
  entries:   PriceListEntry[]
  onSelect:  (description: string, unitPrice: number) => void
  onClose:   () => void
}

export default function PriceListPicker({ entries, onSelect, onClose }: Props) {
  const [grade,    setGrade]    = useState<Grade | ''>('')
  const [distance, setDistance] = useState<DistanceBand | ''>('')
  const [pump,     setPump]     = useState(false)

  const filtered = entries.filter(e => {
    if (grade    && e.grade         !== grade)    return false
    if (distance && e.distance_band !== distance) return false
    if (e.pump_required !== pump)                 return false
    return true
  })

  function handleSelect(entry: PriceListEntry) {
    const desc = `Supply for Concrete ${entry.grade}` +
      (entry.pump_required ? ' (with pump)' : '')
    onSelect(desc, entry.unit_price_kes)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">

        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Price list</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-100 grid grid-cols-3 gap-3">
          <div>
            <label className="label">Concrete grade</label>
            <select value={grade} onChange={e => setGrade(e.target.value as Grade | '')}>
              <option value="">All grades</option>
              {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Distance band</label>
            <select value={distance} onChange={e => setDistance(e.target.value as DistanceBand | '')}>
              <option value="">All distances</option>
              {DISTANCE_BAND_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Pump required</label>
            <select value={pump ? 'yes' : 'no'} onChange={e => setPump(e.target.value === 'yes')}>
              <option value="no">No pump</option>
              <option value="yes">With pump</option>
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-72">
          {filtered.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No matching entries</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Grade</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Distance</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Pump</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Unit price (KSH/m³)</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(entry => (
                  <tr key={entry.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{entry.grade}</td>
                    <td className="px-4 py-2.5 text-gray-600">{entry.distance_band}</td>
                    <td className="px-4 py-2.5 text-gray-600">{entry.pump_required ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                      {entry.unit_price_kes.toLocaleString('en-KE')}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => handleSelect(entry)}
                        className="text-xs text-rhombus-blue hover:underline font-medium">
                        Use →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="btn">Cancel</button>
        </div>
      </div>
    </div>
  )
}
