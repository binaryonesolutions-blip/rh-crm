'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchQuotes } from '@/lib/supabase'
import { STATUS_LABELS, STATUS_COLORS, STATUS_FLOW } from '@/types'
import type { Quote, QuoteStatus } from '@/types'
import { formatKES } from '@/lib/calculations'

const STATUS_FILTERS: Array<{ label: string; value: string }> = [
  { label: 'All', value: 'all' },
  ...STATUS_FLOW.map(s => ({ label: STATUS_LABELS[s], value: s })),
]

export default function DashboardPage() {
  const [quotes,  setQuotes]  = useState<Quote[]>([])
  const [filter,  setFilter]  = useState('all')
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuotes().then(data => { setQuotes(data); setLoading(false) })
  }, [])

  const visible = quotes.filter(q => {
    if (filter !== 'all' && q.status !== filter) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        q.client_name.toLowerCase().includes(s) ||
        q.pi_number.toLowerCase().includes(s) ||
        q.site.toLowerCase().includes(s) ||
        q.quoted_by_name.toLowerCase().includes(s)
      )
    }
    return true
  })

  // Summary counts
  const counts = quotes.reduce((acc, q) => {
    acc[q.status] = (acc[q.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Quotations</h1>
          <p className="text-sm text-gray-500 mt-0.5">{quotes.length} total quotes</p>
        </div>
        <Link href="/quotes/new" className="btn btn-primary">
          + New quotation
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {STATUS_FLOW.map(s => (
          <div key={s} className="card cursor-pointer hover:border-blue-300 transition-colors"
               onClick={() => setFilter(filter === s ? 'all' : s)}>
            <p className="text-xs text-gray-500 font-medium">{STATUS_LABELS[s]}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{counts[s] || 0}</p>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:items-center">
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 overflow-x-auto">
          {STATUS_FILTERS.map(f => (
            <button key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                filter === f.value
                  ? 'bg-rhombus-blue text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search client, PI number, site…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-72"
        />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading quotes…</div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <p className="text-sm">No quotes found</p>
            <Link href="/quotes/new" className="btn btn-primary mt-3">Create first quote</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500">PI Number</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Client</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Site</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Quoted by</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">Grand total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map(q => (
                <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{q.pi_number || 'Draft'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{q.client_name}</td>
                  <td className="px-4 py-3 text-gray-600">{q.site}</td>
                  <td className="px-4 py-3 text-gray-600">{q.quoted_by_name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(q.quote_date).toLocaleDateString('en-KE', { day:'2-digit', month:'short', year:'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_COLORS[q.status as QuoteStatus]}`}>
                      {STATUS_LABELS[q.status as QuoteStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatKES(q.grand_total)}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/quotes/${q.id}`}
                      className="text-rhombus-blue hover:underline text-xs">
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
