// Public read-only quote view — shared with clients
// No authentication required (Supabase anon read policy enabled)
// URL: /quotes/[id]/view

import { fetchQuote } from '@/lib/supabase'
import { formatNum, formatKES, calcLine } from '@/lib/calculations'
import { STATUS_LABELS } from '@/types'
import type { QuoteStatus } from '@/types'

interface Props {
  params: { id: string }
}

export default async function PublicQuoteView({ params }: Props) {
  const quote = await fetchQuote(params.id)

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-lg">Quote not found</p>
          <p className="text-sm mt-1">The link may be invalid or the quote has been removed.</p>
        </div>
      </div>
    )
  }

  const lines = quote.line_items || []

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header card */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">
          <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">RC</div>
                <span className="text-lg font-bold text-gray-900">Rhombus Concrete Ltd</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">info@rhombusconcrete.com</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Proforma Quote</p>
              <p className="text-xl font-bold text-blue-700 mt-1">{quote.pi_number}</p>
              <span className={`inline-flex mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium
                ${quote.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                  quote.status === 'invoiced'  ? 'bg-purple-100 text-purple-700' :
                  'bg-blue-100 text-blue-700'}`}>
                {STATUS_LABELS[quote.status as QuoteStatus]}
              </span>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              ['Date', new Date(quote.quote_date).toLocaleDateString('en-KE', { day:'2-digit', month:'long', year:'numeric' })],
              ['ATTN', quote.client_name],
              ['Site', quote.site],
              ['Quoted by', quote.quoted_by_name],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          <p className="text-sm font-medium text-gray-600">
            <strong>RE:</strong> {quote.subject}
          </p>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-700 text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold w-16">Qty (M³)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Description</th>
                <th className="px-4 py-3 text-right text-xs font-semibold w-28">Unit price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold w-24">Transport</th>
                <th className="px-4 py-3 text-right text-xs font-semibold w-24">Pumping</th>
                <th className="px-4 py-3 text-right text-xs font-semibold w-24">VAT levy</th>
                <th className="px-4 py-3 text-right text-xs font-semibold w-28">VAT (16%)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold w-32">Total (KSH)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lines.map((line, i) => {
                const calc = calcLine(line)
                return (
                  <tr key={line.id} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-3 text-gray-600">{line.qty}</td>
                    <td className="px-4 py-3 text-gray-900">{line.description}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatNum(line.unit_price)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatNum(line.transport)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatNum(line.pumping)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatNum(line.vat_levy)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{formatNum(calc.vat_amount)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatNum(calc.line_total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal (excl. VAT)</span><span>{formatKES(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>VAT (16%)</span><span>{formatKES(quote.total_vat)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-blue-700 pt-2 border-t border-gray-300">
                <span>Grand total</span><span>{formatKES(quote.grand_total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes + Bank details */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Terms</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              <strong>NB:</strong> Payment terms are 100% upfront before delivery.<br /><br />
              <strong>NB:</strong> Volumes below 50M³ attract a pump mobilisation fee of between KSH 25,000–50,000.
            </p>
            {quote.notes && (
              <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100">{quote.notes}</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Bank details</h3>
            <div className="space-y-2">
              {[
                ['Account name',   'Rhombus Concrete Ltd'],
                ['Account number', '0692386490001'],
                ['Paybill',        '552800'],
                ['Bank',           'SBM Bank (Lenana Road)'],
                ['Swift code',     'SBMKKENA'],
                ['Currency',       'KSH'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-medium text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 mt-8">
          Rhombus Concrete Ltd · {quote.pi_number} · This document was generated digitally.
        </p>
      </div>
    </div>
  )
}
