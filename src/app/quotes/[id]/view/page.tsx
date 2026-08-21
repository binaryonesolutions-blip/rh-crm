// Public read-only quote view — shared with clients
// No authentication required (Supabase anon read policy enabled)
// URL: /quotes/[id]/view

import { fetchQuote } from '@/lib/supabase'
import { formatNum, formatKES, calcLineTotal } from '@/lib/calculations'
import { STATUS_LABELS } from '@/types'
import type { QuoteStatus, VatRate, BankAccount } from '@/types'

interface Props { params: { id: string } }

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

  const lines   = quote.line_items || []
  const vatRate = (quote.vat_rate as VatRate) ?? 0.16
  const vatPct  = Math.round(vatRate * 100)
  const bank    = (quote as any).bank_account as BankAccount | null | undefined
  const docTitle = quote.status === 'invoiced' ? 'Invoice' : 'Quotation'

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 pb-6 border-b border-gray-100">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpg" alt="Rhombus Concrete Ltd" className="h-12 w-auto rounded-md object-contain" />
              <p className="text-sm text-gray-400 mt-2">sales@rhombusconcrete.com</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{docTitle}</p>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              ['Date',      new Date(quote.quote_date).toLocaleDateString('en-KE', { day:'2-digit', month:'long', year:'numeric' })],
              ['ATTN',      quote.client_name],
              ['Site',      quote.site],
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
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="bg-blue-700 text-white">
                <th className="px-4 py-3 text-right text-xs font-semibold w-14">QTY</th>
                <th className="px-4 py-3 text-left text-xs font-semibold w-14">UNIT</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">DESCRIPTION</th>
                <th className="px-4 py-3 text-right text-xs font-semibold w-32">Unit Rate (KSHS)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold w-32">Amount (KSHS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lines.map((line: any, i: number) => {
                const lineTotal = calcLineTotal({ qty: line.qty, unit_price: line.unit_price })
                const isTrans   = line.item_type === 'transport'
                let desc = line.description || ''
                if (isTrans && line.distance_km > 0) desc += `  (${line.distance_km} km return trip)`
                return (
                  <tr key={line.id} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-3 text-right text-gray-600">{line.qty}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{line.unit || 'm³'}</td>
                    <td className="px-4 py-3 text-gray-900">{desc}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatNum(line.unit_price)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatNum(lineTotal)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>TOTAL</span><span>{formatNum(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>VAT {vatPct}%</span><span>{formatNum(quote.total_vat)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-blue-700 pt-2 border-t border-gray-300">
                <span>GRAND TOTAL</span><span>{formatKES(quote.grand_total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes + Bank details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Terms</h3>
            <p className="text-sm text-red-600 font-semibold leading-relaxed">
              NB: THE PAYMENT TERMS ARE 100% UPFRONT BEFORE DELIVERY.
            </p>
            <p className="text-sm text-red-600 font-semibold mt-2 leading-relaxed">
              NB: PLEASE NOTE THAT VOLUMES BELOW 50M³ ATTRACT A MOBILIZATION FEE BETWEEN 25,000–70,000 KSH.
            </p>
            {quote.notes && (
              <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100">{quote.notes}</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Payment details</h3>
            {bank ? (
              bank.account_number ? (
                <div className="space-y-2">
                  {(([
                    ['Account name',   bank.account_name],
                    ['Account number', bank.account_number],
                    bank.paybill    ? ['Paybill',    bank.paybill]    : null,
                    bank.bank       ? ['Bank',       bank.bank]       : null,
                    bank.branch     ? ['Branch',     bank.branch]     : null,
                    bank.swift_code ? ['Swift code', bank.swift_code] : null,
                  ] as ([string, string] | null)[]).filter((r): r is [string, string] => r !== null).map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-gray-400">{label}</span>
                      <span className="font-medium text-gray-900">{value}</span>
                    </div>
                  )))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">{bank.name} — cash payment</p>
              )
            ) : (
              <p className="text-sm text-gray-400">Contact us for payment details.</p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 mt-8">
          Rhombus Concrete Ltd · {quote.pi_number} · Generated digitally
        </p>
      </div>
    </div>
  )
}
