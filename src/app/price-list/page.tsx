'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase, fetchPriceList, fetchPricingConfig, parsePricingConfig, updatePricingConfig } from '@/lib/supabase'
import type { PriceListEntry, Grade, PumpConfig, TransportConfig } from '@/types'
import { GRADE_OPTIONS, DEFAULT_PUMP_CONFIG, DEFAULT_TRANSPORT_CONFIG } from '@/types'

// ── Inline editable number field ────────────────────────────
function EditableValue({
  label, value, unit, onSave,
}: { label: string; value: number; unit: string; onSave: (v: number) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)
  const [saving,  setSaving]  = useState(false)

  async function save() {
    setSaving(true)
    await onSave(draft)
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <input
              type="number"
              className="w-28 text-right text-sm"
              value={draft}
              onChange={e => setDraft(parseFloat(e.target.value) || 0)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
            />
            <span className="text-xs text-gray-400">{unit}</span>
            <button onClick={save} disabled={saving} className="btn btn-primary py-1 px-2 text-xs">
              {saving ? '…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="btn py-1 px-2 text-xs">×</button>
          </>
        ) : (
          <>
            <span className="text-sm font-semibold text-gray-900">
              KSH {value.toLocaleString('en-KE')} <span className="font-normal text-gray-400">{unit}</span>
            </span>
            <button onClick={() => { setDraft(value); setEditing(true) }} className="text-xs text-blue-600 hover:underline ml-2">
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function PriceListPage() {
  const [entries,  setEntries]  = useState<PriceListEntry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState<string | null>(null)
  const [editVal,  setEditVal]  = useState<number>(0)
  const [showForm, setShowForm] = useState(false)
  const [newRow,   setNewRow]   = useState({ grade: 'C20' as Grade, unit_price_kes: 0 })

  const [pumpCfg,  setPumpCfg]  = useState<PumpConfig>(DEFAULT_PUMP_CONFIG)
  const [transCfg, setTransCfg] = useState<TransportConfig>(DEFAULT_TRANSPORT_CONFIG)

  async function loadAll() {
    const [pl, cfg] = await Promise.all([fetchPriceList(), fetchPricingConfig()])
    setEntries(pl)
    if (cfg.length > 0) {
      const { pump, transport } = parsePricingConfig(cfg)
      setPumpCfg(pump)
      setTransCfg(transport)
    }
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  async function saveEdit(id: string) {
    const { error } = await supabase
      .from('price_list')
      .update({ unit_price_kes: editVal })
      .eq('id', id)
    if (error) { toast.error('Failed to update price'); return }
    toast.success('Price updated')
    setEditing(null)
    loadAll()
  }

  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase.from('price_list').update({ active: !current }).eq('id', id)
    if (error) { toast.error('Failed to update'); return }
    loadAll()
  }

  async function addEntry() {
    if (!newRow.unit_price_kes) { toast.error('Enter a unit price'); return }
    const { error } = await supabase.from('price_list').insert([newRow])
    if (error) { toast.error('Failed to add — grade may already exist'); return }
    toast.success('Entry added')
    setShowForm(false)
    loadAll()
  }

  async function savePricingKey(key: string, value: number) {
    const ok = await updatePricingConfig(key, value)
    if (ok) {
      toast.success('Rate updated')
      loadAll()
    } else {
      toast.error('Failed to update')
    }
  }

  return (
    <div className="space-y-8">

      {/* ── Concrete prices ─────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Concrete prices</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Per grade — {entries.filter(e => e.active).length} active
            </p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Add grade</button>
        </div>

        {showForm && (
          <div className="card mb-4 border-blue-200">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">New price entry</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Grade</label>
                <select value={newRow.grade}
                  onChange={e => setNewRow(r => ({ ...r, grade: e.target.value as Grade }))}>
                  {GRADE_OPTIONS.map(g => <option key={g}>{g}</option>)}
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
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Grade</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Unit price (KSH/m³)</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Valid from</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map(entry => (
                  <tr key={entry.id} className={`hover:bg-gray-50 ${!entry.active ? 'opacity-40' : ''}`}>
                    <td className="px-4 py-2.5 font-semibold text-gray-900">Concrete {entry.grade}</td>
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
                      ) : entry.unit_price_kes.toLocaleString('en-KE')}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{entry.valid_from}</td>
                    <td className="px-4 py-2.5">
                      <span className={`badge ${entry.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {entry.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-2">
                        <button onClick={() => { setEditing(entry.id); setEditVal(entry.unit_price_kes) }}
                          className="text-xs text-blue-600 hover:underline">Edit</button>
                        <button onClick={() => toggleActive(entry.id, entry.active)}
                          className="text-xs text-gray-400 hover:underline">
                          {entry.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                      No entries yet. Click "+ Add grade" to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Transport rates ──────────────────────────────── */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Transport rates</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Formula: (return trip km ÷ km/litre × fuel price ÷ fuel divisor) + (daily truck cost ÷ m³/load) = KSH/m³
          </p>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Fuel inputs</h3>
            <EditableValue
              label="Fuel price per litre"
              value={(transCfg as any).fuel_price_per_litre ?? 232}
              unit="KSH/litre"
              onSave={v => savePricingKey('fuel_price_per_litre', v)}
            />
            <EditableValue
              label="Truck fuel efficiency"
              value={(transCfg as any).km_per_litre ?? 1.3}
              unit="km per litre"
              onSave={v => savePricingKey('km_per_litre', v)}
            />
            <EditableValue
              label="Fuel divisor"
              value={(transCfg as any).fuel_divisor ?? 6}
              unit="(internal constant — do not change unless advised)"
              onSave={v => savePricingKey('fuel_divisor', v)}
            />
          </div>
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Example calculation</h3>
            {(() => {
              const fuelPrice  = (transCfg as any).fuel_price_per_litre ?? 232
              const kmPerL     = (transCfg as any).km_per_litre ?? 1.3
              const fuelDiv    = (transCfg as any).fuel_divisor ?? 6
              const exDist     = 10
              const perM3      = Math.round(exDist / kmPerL * fuelPrice / fuelDiv * 100) / 100
              return (
                <div className="text-xs text-gray-600 space-y-1.5">
                  <p className="text-gray-400 mb-2">Return trip distance: {exDist} km</p>
                  <p>Fuel: {exDist} ÷ {kmPerL} km/L × KSH {fuelPrice} ÷ {fuelDiv} = <strong>KSH {perM3.toLocaleString('en-KE')}/m³</strong></p>
                  <p className="pt-1 border-t border-gray-100">
                    Transport = <strong className="text-rhombus-blue">KSH {perM3.toLocaleString('en-KE')}/m³</strong>
                  </p>
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* ── Pump rates ──────────────────────────────────── */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Pump rates</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Pump is charged per m³ plus a mobilisation fee based on total volume ordered
          </p>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Pump rate</h3>
            <EditableValue
              label="Pump charge per m³"
              value={pumpCfg.pump_rate_per_m3}
              unit="per m³"
              onSave={v => savePricingKey('pump_rate_per_m3', v)}
            />
          </div>
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Mobilisation fees by volume</h3>
            <EditableValue
              label="0 – 10 m³"
              value={pumpCfg.mob_0_10}
              unit="flat fee"
              onSave={v => savePricingKey('mob_0_10', v)}
            />
            <EditableValue
              label="11 – 20 m³"
              value={pumpCfg.mob_11_20}
              unit="flat fee"
              onSave={v => savePricingKey('mob_11_20', v)}
            />
            <EditableValue
              label="21 – 30 m³"
              value={pumpCfg.mob_21_30}
              unit="flat fee"
              onSave={v => savePricingKey('mob_21_30', v)}
            />
            <EditableValue
              label="31 – 40 m³"
              value={pumpCfg.mob_31_40}
              unit="flat fee"
              onSave={v => savePricingKey('mob_31_40', v)}
            />
            <EditableValue
              label="41 – 49 m³"
              value={pumpCfg.mob_41_49}
              unit="flat fee"
              onSave={v => savePricingKey('mob_41_49', v)}
            />
            <p className="text-xs text-gray-400 mt-3">50 m³ and above — no mobilisation fee</p>
          </div>
        </div>
      </div>

    </div>
  )
}
