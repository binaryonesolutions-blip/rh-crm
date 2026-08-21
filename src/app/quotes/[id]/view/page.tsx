// Public read-only quote view — shared with clients.
// Designed to mirror the downloadable PDF invoice (src/components/PDFDocument.tsx)
// as closely as possible so the on-screen view and the PDF match.
// No authentication required (Supabase anon read policy enabled)
// URL: /quotes/[id]/view

import { fetchQuote } from '@/lib/supabase'
import { formatNum } from '@/lib/calculations'
import { DEFAULT_TERMS } from '@/types'
import type { VatRate, BankAccount } from '@/types'

interface Props { params: { id: string } }

const BLUE = '#185FA5'

export default async function PublicQuoteView({ params }: Props) {
  const quote = await fetchQuote(params.id)

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-lg">Quote not found</p>
          <p className="text-sm mt-1">The link may be invalid or the quote has been removed.</p>
        </div>
      </div>
    )
  }

  const lines     = (quote.line_items || []) as any[]
  const vatRate   = (quote.vat_rate as VatRate) ?? 0.16
  const vatPct    = Math.round(vatRate * 100)
  const bank      = (quote as any).bank_account as BankAccount | null | undefined
  const docTitle  = quote.status === 'invoiced' ? 'INVOICE' : 'QUOTATION'
  const termsText = quote.notes && quote.notes.trim() ? quote.notes : DEFAULT_TERMS

  // Pump lines are billed against the total concrete volume (matches the PDF).
  const totalConcreteM3 = lines
    .filter(l => (l.item_type || 'concrete') === 'concrete')
    .reduce((sum, l) => sum + (l.qty || 0), 0)

  const bankRows: [string, string][] = bank ? (
    ([
      ['Account name',   bank.account_name],
      ['Account number', bank.account_number],
      bank.paybill    ? ['Paybill',    bank.paybill]    : null,
      bank.bank       ? ['Bank',       bank.bank]       : null,
      bank.branch     ? ['Branch',     bank.branch]     : null,
      bank.swift_code ? ['Swift code', bank.swift_code] : null,
    ] as ([string, string] | null)[]).filter((r): r is [string, string] => r !== null)
  ) : []

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-3 sm:px-4">
      <div
        className="mx-auto max-w-[820px] bg-white shadow-lg rounded-sm p-6 sm:p-10"
        style={{ fontFamily: 'Helvetica, Arial, sans-serif', color: '#1a1a1a' }}
      >
        {/* Header */}
        <div
          className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 pb-4 mb-6"
          style={{ borderBottom: `2px solid ${BLUE}` }}
        >
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="Rhombus Concrete Ltd" className="h-[46px] w-auto object-contain" />
            <p className="text-[11px] text-gray-500 mt-2">Rhombus HQ, Tara Road off Kiambu Road, Nairobi</p>
            <p className="text-[11px] text-gray-500">+254-702-700-700 / +254-705-900-000</p>
            <p className="text-[11px] text-gray-500">sales@rhombusconcrete.com</p>
          </div>
          <div className="sm:text-right shrink-0">
            <p className="text-2xl font-bold tracking-tight" style={{ color: BLUE }}>{docTitle}</p>
            <p className="text-xs text-gray-500 mt-1">{quote.pi_number}</p>
            {quote.invoice_number && <p className="text-xs text-gray-500">Ref: {quote.invoice_number}</p>}
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-6 gap-y-3 rounded p-3 mb-4" style={{ backgroundColor: '#EFF6FF' }}>
          {([
            ['Date',      new Date(quote.quote_date).toLocaleDateString('en-KE', { day:'2-digit', month:'long', year:'numeric' })],
            ['ATTN',      quote.client_name],
            quote.cc ? ['CC', quote.cc] : null,
            ['Site',      quote.site],
            ['Quoted by', quote.quoted_by_name],
          ] as ([string, string] | null)[]).filter((r): r is [string, string] => r !== null).map(([label, value]) => (
            <div key={label} className="min-w-[70px]">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-sm text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* RE */}
        <p className="text-sm font-bold text-gray-700 mb-3">RE: {quote.subject}</p>

        {/* Line items */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px] border-collapse">
            <thead>
              <tr className="text-white" style={{ backgroundColor: BLUE }}>
                <th className="px-2 py-1.5 text-right text-xs font-bold w-14">QTY</th>
                <th className="px-2 py-1.5 text-center text-xs font-bold w-14">UNIT</th>
                <th className="px-2 py-1.5 text-left text-xs font-bold">DESCRIPTION</th>
                <th className="px-2 py-1.5 text-right text-xs font-bold w-28">Unit Rate (KSHS)</th>
                <th className="px-2 py-1.5 text-right text-xs font-bold w-28">Amount (KSHS)</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const itemType  = line.item_type || 'concrete'
                const isPump    = itemType === 'pump'
                const isTrans   = itemType === 'transport'
                const unit      = line.unit || 'm³'
                const qty       = isPump ? totalConcreteM3 : (line.qty ?? 0)
                const unitPrice = line.unit_price ?? 0
                const lineTotal = Math.round(qty * unitPrice * 100) / 100
                let desc = line.description || ''
                if (isTrans && line.distance_km > 0) desc += `  (${line.distance_km} km return trip)`
                return (
                  <tr key={line.id || i} style={i % 2 === 1 ? { backgroundColor: '#f9fafb' } : undefined}
                      className="border-b border-gray-100">
                    <td className="px-2 py-1.5 text-right text-gray-700">{qty}</td>
                    <td className="px-2 py-1.5 text-center text-gray-400 text-xs">{unit}</td>
                    <td className="px-2 py-1.5 text-gray-800">{desc}</td>
                    <td className="px-2 py-1.5 text-right text-gray-700">{formatNum(unitPrice)}</td>
                    <td className="px-2 py-1.5 text-right font-bold text-gray-900">{formatNum(lineTotal)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mt-3">
          <div className="w-56">
            <div className="flex justify-between py-1 border-b border-gray-200 text-xs text-gray-600">
              <span>TOTAL</span><span>{formatNum(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200 text-xs text-gray-600">
              <span>VAT {vatPct}%</span><span>{formatNum(quote.total_vat)}</span>
            </div>
            <div className="flex justify-between py-1.5 text-base font-bold" style={{ color: BLUE }}>
              <span>GRAND TOTAL</span><span>{formatNum(quote.grand_total)}</span>
            </div>
          </div>
        </div>

        {/* Terms & notes */}
        <div className="mt-4 pt-2 border-t border-gray-200">
          <p className="text-xs font-bold leading-relaxed whitespace-pre-line" style={{ color: '#e53e3e' }}>
            {termsText}
          </p>
        </div>

        {/* Payment details */}
        {bank && (
          <div className="mt-4 pt-3" style={{ borderTop: `1.5px solid ${BLUE}` }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: BLUE }}>Payment details</p>
            {bank.account_number ? (
              <div className="flex flex-wrap gap-x-8 gap-y-2">
                {bankRows.map(([label, value]) => (
                  <div key={label} className="min-w-[30%]">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
                    <p className="text-xs font-bold text-gray-800">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-600">{bank.name} — cash payment</p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-2 border-t border-gray-200 flex justify-between text-[10px] text-gray-400">
          <span>Rhombus Concrete Ltd — {quote.pi_number}</span>
          <span>Generated digitally</span>
        </div>
      </div>
    </div>
  )
}
