'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchQuotes } from '@/lib/supabase'
import { formatKES } from '@/lib/calculations'
import { STATUS_LABELS, STATUS_COLORS } from '@/types'
import type { Quote, QuoteStatus } from '@/types'

export default function QuotesListPage() {
  const [quotes,  setQuotes]  = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<QuoteStatus | 'all'>('all')

  useEffect(() => {
    fetchQuotes().then(data => {
      setQuotes(data)
      setLoading(false)
    })
  }, [])

  const filtered = filter === 'all' ? quotes : quotes.filter(q => q.status === filter)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Quotes</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {quotes.length} total
          </p>
        </div>
        <Link href="/quotes/new" className="btn btn-primary">+ New quote</Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-1">
        {(['all', 'draft', 'sent', 'confirmed', 'invoiced'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${filter === s ? 'bg-rhombus-blue text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading…</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">PI Number</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Client</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Site</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Quoted by</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Date</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Grand total</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(quote => (
                <tr key={quote.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/quotes/${quote.id}`} className="font-semibold text-rhombus-blue hover:underline">
                      {quote.pi_number || 'Draft'}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-900">{quote.client_name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{quote.site}</td>
                  <td className="px-4 py-2.5 text-gray-500">{quote.quoted_by_name}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">
                    {new Date(quote.quote_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                    {formatKES(quote.grand_total)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${STATUS_COLORS[quote.status as QuoteStatus]}`}>
                      {STATUS_LABELS[quote.status as QuoteStatus]}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                    {filter === 'all'
                      ? 'No quotes yet. Click "+ New quote" to create one.'
                      : `No ${STATUS_LABELS[filter as QuoteStatus].toLowerCase()} quotes.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
