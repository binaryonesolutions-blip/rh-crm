'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase, fetchStaff } from '@/lib/supabase'
import type { Staff, StaffRole } from '@/types'

const ROLE_LABELS: Record<StaffRole, string> = {
  fso:           'Field Sales Officer (FSO)',
  sales_admin:   'Sales Admin',
  sales_manager: 'Sales Manager',
  it_admin:      'IT Admin',
}

export default function SettingsPage() {
  const [staff,    setStaff]    = useState<Staff[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'fso' as StaffRole })

  async function load() {
    fetchStaff().then(data => { setStaff(data); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  async function addMember() {
    if (!newMember.name.trim()) { toast.error('Name is required'); return }
    const { error } = await supabase.from('staff').insert([newMember])
    if (error) { toast.error('Failed to add staff member'); return }
    toast.success(`${newMember.name} added`)
    setNewMember({ name: '', email: '', role: 'fso' })
    setShowForm(false)
    load()
  }

  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase.from('staff').update({ active: !current }).eq('id', id)
    if (error) { toast.error('Failed to update'); return }
    load()
  }

  async function updateRole(id: string, role: StaffRole) {
    const { error } = await supabase.from('staff').update({ role }).eq('id', id)
    if (error) { toast.error('Failed to update role'); return }
    toast.success('Role updated')
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Staff management — {staff.length} members</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Add staff</button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card mb-6 border-blue-200">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">New staff member</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">Full name *</label>
              <input type="text" placeholder="e.g. James Kamau"
                value={newMember.name}
                onChange={e => setNewMember(m => ({ ...m, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email (optional)</label>
              <input type="text" placeholder="e.g. james@rhombusconcrete.com"
                value={newMember.email}
                onChange={e => setNewMember(m => ({ ...m, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Role</label>
              <select value={newMember.role}
                onChange={e => setNewMember(m => ({ ...m, role: e.target.value as StaffRole }))}>
                {(Object.entries(ROLE_LABELS) as [StaffRole, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addMember} className="btn btn-primary">Add</button>
            <button onClick={() => setShowForm(false)} className="btn">Cancel</button>
          </div>
        </div>
      )}

      {/* Staff table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map(member => (
                <tr key={member.id} className={`hover:bg-gray-50 ${!member.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{member.name}</td>
                  <td className="px-4 py-3 text-gray-500">{member.email || '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={member.role}
                      onChange={e => updateRole(member.id, e.target.value as StaffRole)}
                      className="w-auto py-1 text-xs">
                      {(Object.entries(ROLE_LABELS) as [StaffRole, string][]).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${member.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {member.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(member.id, member.active)}
                      className="text-xs text-gray-400 hover:underline">
                      {member.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Supabase keep-alive reminder */}
      <div className="card mt-6 border-amber-200 bg-amber-50">
        <h2 className="text-sm font-semibold text-amber-800 mb-2">⚠ Supabase free tier — keep-alive reminder</h2>
        <p className="text-sm text-amber-700">
          Supabase pauses free projects after 7 days of inactivity. Set up a free cron job at{' '}
          <a href="https://cron-job.org" target="_blank" rel="noopener noreferrer"
            className="underline">cron-job.org</a>{' '}
          to ping your Supabase URL every 3 days.
          Ping target: <code className="bg-amber-100 px-1 rounded text-xs">{process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/staff?select=id&limit=1</code>
          {' '}with the anon key in the Authorization header.
        </p>
      </div>
    </div>
  )
}
