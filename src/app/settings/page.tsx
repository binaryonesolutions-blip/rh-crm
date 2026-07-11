'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase, fetchStaff, fetchBankAccounts, fetchCompanyConfig, updateCompanyConfig } from '@/lib/supabase'
import type { Staff, StaffRole, BankAccount, CompanyConfig } from '@/types'
import { ROLE_LABELS } from '@/types'

// ── Simple editable text field ─────────────────────────────
function EditableText({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)
  const [saving,  setSaving]  = useState(false)
  async function save() {
    setSaving(true); await onSave(draft); setSaving(false); setEditing(false)
  }
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      {editing ? (
        <div className="flex items-center gap-2">
          <input type="text" className="w-60 text-sm" value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
            autoFocus />
          <button onClick={save} disabled={saving} className="btn btn-primary py-1 px-2 text-xs">{saving ? '…' : 'Save'}</button>
          <button onClick={() => setEditing(false)} className="btn py-1 px-2 text-xs">×</button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-900">{value || <span className="text-gray-400">Not set</span>}</span>
          <button onClick={() => { setDraft(value); setEditing(true) }} className="text-xs text-blue-600 hover:underline">Edit</button>
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const [staff,        setStaff]        = useState<Staff[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [companyConf,  setCompanyConf]  = useState<CompanyConfig[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showStaffForm, setShowStaffForm] = useState(false)
  const [showBankForm,  setShowBankForm]  = useState(false)
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'kam' as StaffRole })
  const [newBank,   setNewBank]   = useState({
    name: '', account_name: '', account_number: '', paybill: '',
    bank: '', branch: '', swift_code: '', is_default: false,
  })

  async function loadAll() {
    const [s, b, c] = await Promise.all([fetchStaff(), fetchBankAccounts(), fetchCompanyConfig()])
    setStaff(s); setBankAccounts(b); setCompanyConf(c); setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  function cfgVal(key: string) { return companyConf.find(c => c.key === key)?.value || '' }
  async function saveCfg(key: string, value: string) {
    const ok = await updateCompanyConfig(key, value)
    if (ok) { toast.success('Updated'); loadAll() }
    else toast.error('Failed to update')
  }

  async function addMember() {
    if (!newMember.name.trim()) { toast.error('Name required'); return }
    const { error } = await supabase.from('staff').insert([newMember])
    if (error) { toast.error('Failed to add staff'); return }
    toast.success(`${newMember.name} added`)
    setNewMember({ name: '', email: '', role: 'kam' })
    setShowStaffForm(false); loadAll()
  }

  async function toggleStaff(id: string, active: boolean) {
    await supabase.from('staff').update({ active: !active }).eq('id', id)
    loadAll()
  }

  async function updateRole(id: string, role: StaffRole) {
    await supabase.from('staff').update({ role }).eq('id', id)
    toast.success('Role updated'); loadAll()
  }

  const [editingBank, setEditingBank] = useState<BankAccount | null>(null)

  async function addBank() {
    if (!newBank.name.trim()) { toast.error('Account name required'); return }
    const { error } = await supabase.from('bank_accounts').insert([newBank])
    if (error) { toast.error('Failed to add bank account'); return }
    toast.success(`${newBank.name} added`)
    setNewBank({ name: '', account_name: '', account_number: '', paybill: '', bank: '', branch: '', swift_code: '', is_default: false })
    setShowBankForm(false); loadAll()
  }

  async function saveBank() {
    if (!editingBank) return
    const { id, created_at, ...fields } = editingBank as any
    const { error } = await supabase.from('bank_accounts').update(fields).eq('id', editingBank.id)
    if (error) { toast.error('Failed to save'); return }
    toast.success('Bank account updated')
    setEditingBank(null); loadAll()
  }

  async function toggleBank(id: string, active: boolean) {
    await supabase.from('bank_accounts').update({ active: !active }).eq('id', id)
    loadAll()
  }

  return (
    <div className="space-y-8">

      {/* ── Company info ────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Settings</h1>
        <p className="text-sm text-gray-400 mb-4">Company info, bank accounts, and staff</p>

        <div className="card max-w-lg">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Company info</h2>
          {loading ? <p className="text-sm text-gray-400">Loading…</p> : (
            <>
              <EditableText label="Phone number" value={cfgVal('phone')} onSave={v => saveCfg('phone', v)} />
              <EditableText label="Address"      value={cfgVal('address')} onSave={v => saveCfg('address', v)} />
              <EditableText label="Email"        value={cfgVal('email')} onSave={v => saveCfg('email', v)} />
            </>
          )}
        </div>
      </div>

      {/* ── Bank accounts ────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Bank accounts</h2>
            <p className="text-sm text-gray-400 mt-0.5">Selectable per quote — shown on PDF payment details</p>
          </div>
          <button onClick={() => setShowBankForm(true)} className="btn btn-primary">+ Add account</button>
        </div>

        {showBankForm && (
          <div className="card mb-4 border-blue-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">New bank account</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                ['Display name *', 'name', 'e.g. SBM Bank'],
                ['Account name',   'account_name', 'Rhombus Concrete Ltd'],
                ['Account number', 'account_number', ''],
                ['Paybill',        'paybill', ''],
                ['Bank',           'bank', ''],
                ['Branch',         'branch', ''],
                ['Swift code',     'swift_code', ''],
              ].map(([label, key, ph]) => (
                <div key={key as string}>
                  <label className="label">{label}</label>
                  <input type="text" placeholder={ph as string}
                    value={(newBank as any)[key as string]}
                    onChange={e => setNewBank(b => ({ ...b, [key as string]: e.target.value }))} />
                </div>
              ))}
              <div className="flex items-center gap-2 pt-4">
                <input type="checkbox" checked={newBank.is_default}
                  onChange={e => setNewBank(b => ({ ...b, is_default: e.target.checked }))}
                  className="w-4 h-4 accent-rhombus-blue" />
                <label className="text-sm text-gray-600">Set as default</label>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-3">Leave account number blank for cash/petty cash accounts.</p>
            <div className="flex gap-2">
              <button onClick={addBank} className="btn btn-primary">Add</button>
              <button onClick={() => setShowBankForm(false)} className="btn">Cancel</button>
            </div>
          </div>
        )}

        {/* Edit bank panel */}
        {editingBank && (
          <div className="card mb-4 border-blue-300 bg-blue-50/30">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Edit — {editingBank.name}</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {([
                ['Display name',   'name'],
                ['Account name',   'account_name'],
                ['Account number', 'account_number'],
                ['Paybill',        'paybill'],
                ['Bank',           'bank'],
                ['Branch',         'branch'],
                ['Swift code',     'swift_code'],
              ] as [string, keyof BankAccount][]).map(([label, key]) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input type="text"
                    value={(editingBank as any)[key] ?? ''}
                    onChange={e => setEditingBank(b => b ? { ...b, [key]: e.target.value } : b)} />
                </div>
              ))}
              <div className="flex items-center gap-2 pt-4">
                <input type="checkbox" checked={editingBank.is_default}
                  onChange={e => setEditingBank(b => b ? { ...b, is_default: e.target.checked } : b)}
                  className="w-4 h-4 accent-rhombus-blue" />
                <label className="text-sm text-gray-600">Set as default</label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveBank} className="btn btn-primary">Save changes</button>
              <button onClick={() => setEditingBank(null)} className="btn">Cancel</button>
            </div>
          </div>
        )}

        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Bank</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Account no.</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Paybill</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bankAccounts.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No bank accounts yet. Click "+ Add account".</td></tr>
              ) : bankAccounts.map(b => (
                <tr key={b.id} className={`hover:bg-gray-50 ${!b.active ? 'opacity-40' : ''} ${editingBank?.id === b.id ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-2.5 font-semibold">
                    {b.name}
                    {b.is_default && <span className="ml-2 text-xs text-blue-600 font-normal">default</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{b.bank || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{b.account_number || <span className="text-gray-300">cash</span>}</td>
                  <td className="px-4 py-2.5 text-gray-500">{b.paybill || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${b.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {b.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-3">
                      <button onClick={() => setEditingBank({ ...b })} className="text-xs text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => toggleBank(b.id, b.active)} className="text-xs text-gray-400 hover:underline">
                        {b.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Staff ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Staff</h2>
            <p className="text-sm text-gray-400 mt-0.5">{staff.length} active members</p>
          </div>
          <button onClick={() => setShowStaffForm(true)} className="btn btn-primary">+ Add staff</button>
        </div>

        {showStaffForm && (
          <div className="card mb-4 border-blue-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">New staff member</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="label">Full name *</label>
                <input type="text" value={newMember.name}
                  onChange={e => setNewMember(m => ({ ...m, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="text" value={newMember.email}
                  onChange={e => setNewMember(m => ({ ...m, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Role</label>
                <select value={newMember.role}
                  onChange={e => setNewMember(m => ({ ...m, role: e.target.value as StaffRole }))}>
                  {(Object.entries(ROLE_LABELS) as [StaffRole, string][]).map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addMember} className="btn btn-primary">Add</button>
              <button onClick={() => setShowStaffForm(false)} className="btn">Cancel</button>
            </div>
          </div>
        )}

        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Email</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Role</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map(m => (
                <tr key={m.id} className={`hover:bg-gray-50 ${!m.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{m.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{m.email || '—'}</td>
                  <td className="px-4 py-2.5">
                    <select value={m.role} onChange={e => updateRole(m.id, e.target.value as StaffRole)}
                      className="w-auto py-1 text-xs">
                      {(Object.entries(ROLE_LABELS) as [StaffRole, string][]).map(([val, lbl]) => (
                        <option key={val} value={val}>{lbl}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${m.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {m.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => toggleStaff(m.id, m.active)} className="text-xs text-gray-400 hover:underline">
                      {m.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supabase keep-alive */}
      <div className="card border-amber-200 bg-amber-50">
        <h2 className="text-sm font-semibold text-amber-800 mb-1">⚠ Supabase free tier keep-alive</h2>
        <p className="text-sm text-amber-700">
          Supabase pauses free projects after 7 days of inactivity. Set a cron job at{' '}
          <a href="https://cron-job.org" target="_blank" rel="noopener noreferrer" className="underline">cron-job.org</a>{' '}
          to ping every 3 days: <code className="bg-amber-100 px-1 rounded text-xs">{process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/staff?select=id&limit=1</code>
        </p>
      </div>
    </div>
  )
}
