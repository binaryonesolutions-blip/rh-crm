'use client'

import { useState } from 'react'
import type { PriceListEntry, Grade } from '@/types'
import { GRADE_OPTIONS } from '@/types'

interface Props {
  entries:   PriceListEntry[]
  onSelect:  (description: string, unitPrice: number) => void
  onClose:   () => void
}

export default function PriceListPicker({ entries, onSelect, onClose }: Props) {
  const [grade, setGrade] = useState<Grade | ''>('')

  const filtered = grade ? entries.filter(e => e.grade === grade) : entries

  function handleSelect(entry: PriceListEntry) {
    onSelect(`Supply of Concrete ${entry.grade}`, entry.unit_price_kes)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">

        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Select concrete grade</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Filter */}
        <div className="p-4 border-b border-gray-100">
          <label className="label">Filter by grade</label>
          <select value={grade} onChange={e => setGrade(e.target.value as Grade | '')}>
            <option value="">All grades</option>
            {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-72">
          {filtered.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No entries found</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Grade</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Unit price (KSH/m³)</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(entry => (
                  <tr key={entry.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{entry.grade}</td>
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
