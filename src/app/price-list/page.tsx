'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase, fetchPriceList } from '@/lib/supabase'
import type { PriceListEntry, Grade, DistanceBand } from '@/types'
import { GRADE_OPTIONS, DISTANCE_BAND_OPTIONS } from '@/types'

export default function PriceListPage() {
  const [entries,  setEntries]  = useState<PriceListEntry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState<string | null>(null)
  const [editVal,  setEditVal]  = useState<number>(0)
  const [showForm, setShowForm] = useState(false)
  const [newRow, setNewRow] = useState({
    grade: 'C20' as Grade,
    distance_band: '0-10km' as DistanceBand,
    pump_required: false,
    unit_price_kes: 0,
  })

  async function load() {
    fetchPriceList().then(data => { setEntries(data); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  async function saveEdit(id: string) {
    const { error } = await supabase
      .from('price_list')
      .update({ unit_price_kes: editVal })
      .eq('id', id)
    if (error) { toast.error('Failed to update price'); return }
    toast.success('Price updated')
    setEditing(null)
    load()
  }

  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase
      .from('price_list')
      .update({ active: !current })
      .eq('id', id)
    if (error) { toast.error('Failed to update'); return }
    load()
  }

  async function addEntry() {
    const { error } = await supabase.from('price_list').insert([newRow])
    if (error) { toast.error('Failed to add entry — combination may already exist'); return }
    toast.success('Entry added')
    setShowForm(false)
    load()
  }

  // Group by grade for display
  const grades = GRADE_OPTIONS
  const distances = DISTANCE_BAND_OPTIONS

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Price list</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Grade × Distance band × Pump — {entries.filter(e => e.active).length} active entries
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Add entry</button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card mb-6 border-blue-200">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">New price entry</h2>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="label">Grade</label>
              <select value={newRow.grade}
                onChange={e => setNewRow(r => ({ ...r, grade: e.target.value as Grade }))}>
                {GRADE_OPTIONS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Distance band</label>
              <select value={newRow.distance_band}
                onChange={e => setNewRow(r => ({ ...r, distance_band: e.target.value as DistanceBand }))}>
                {DISTANCE_BAND_OPTIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Pump required</label>
              <select value={newRow.pump_required ? 'yes' : 'no'}
                onChange={e => setNewRow(r => ({ ...r, pump_required: e.target.value === 'yes' }))}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div>
              <label className="label">Unit price (KSH/m³)</label>
              <input type="number" value={newRow.unit_price_kes}
                onChange={e => setNewRow(r => ({ ...r, unit_price_kes: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addEntry} className="btn btn-primary">Add</button>
            <button onClick={() => setShowForm(false)} className="btn">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>
      ) : (
        <div className="space-y-6">
          {grades.map(grade => {
            const gradeEntries = entries.filter(e => e.grade === grade)
            if (gradeEntries.length === 0) return null
            return (
              <div key={grade} className="card p-0 overflow-hidden">
                <div className="bg-blue-700 text-white px-5 py-2.5">
                  <h2 className="font-semibold text-sm">Concrete {grade}</h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Distance band</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Pump</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Unit price (KSH/m³)</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Valid from</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {gradeEntries.map(entry => (
                      <tr key={entry.id} className={`hover:bg-gray-50 ${!entry.active ? 'opacity-40' : ''}`}>
                        <td className="px-4 py-2.5 text-gray-600">{entry.distance_band}</td>
                        <td className="px-4 py-2.5 text-gray-600">{entry.pump_required ? 'Yes' : 'No'}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                          {editing === entry.id ? (
                            <div className="flex justify-end gap-2">
                              <input type="number" className="w-32 text-right"
                                value={editVal}
                                onChange={e => setEditVal(parseFloat(e.target.value) || 0)}
                                autoFocus />
                              <button onClick={() => saveEdit(entry.id)} className="btn btn-primary py-1 px-2 text-xs">Save</button>
                              <button onClick={() => setEditing(null)} className="btn py-1 px-2 text-xs">×</button>
                            </div>
                          ) : (
                            entry.unit_price_kes.toLocaleString('en-KE')
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{entry.valid_from}</td>
                        <td className="px-4 py-2.5">
                          <span className={`badge ${entry.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {entry.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setEditing(entry.id); setEditVal(entry.unit_price_kes) }}
                              className="text-xs text-blue-600 hover:underline">
                              Edit
                            </button>
                            <button
                              onClick={() => toggleActive(entry.id, entry.active)}
                              className="text-xs text-gray-400 hover:underline">
                              {entry.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
