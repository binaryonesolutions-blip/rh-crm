'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'

// Both PDFDownloadLink and PDFDocument must stay out of SSR
const PDFDownloadButton = dynamic(() => import('./PDFDownloadButton'), { ssr: false })
import type { Quote, QuoteForm, LineItemForm, Staff, PriceListEntry, QuoteStatus } from '@/types'
import { emptyLine, calcTotals, formatKES } from '@/lib/calculations'
import { updateQuote, updateQuoteStatus } from '@/lib/supabase'
import StageBar from './StageBar'
import LineItemsTable from './LineItemsTable'


interface Props {
  quote:     Quote
  staff:     Staff[]
  priceList: PriceListEntry[]
  isNew?:    boolean
  onSave:    (form: QuoteForm) => Promise<void>
}

function quoteToForm(q: Quote): QuoteForm {
  return {
    quoted_by_id:         q.quoted_by_id         || '',
    quoted_by_name:       q.quoted_by_name        || '',
    client_name:          q.client_name           || '',
    cc:                   q.cc                    || '',
    site:                 q.site                  || '',
    subject:              q.subject               || 'Quotation for the supply of Ready Mix Concrete',
    quote_date:           q.quote_date            || new Date().toISOString().slice(0, 10),
    sap_quote_no:         q.sap_quote_no          || '',
    sap_so_no:            q.sap_so_no             || '',
    odoo_opportunity_ref: q.odoo_opportunity_ref  || '',
    notes:                q.notes                 || '',
    line_items: (q.line_items || []).map(l => ({
      id:          l.id,
      sort_order:  l.sort_order,
      qty:         l.qty,
      description: l.description,
      unit_price:  l.unit_price,
      transport:   l.transport,
      pumping:     l.pumping,
      vat_levy:    l.vat_levy,
    })),
  }
}

export default function QuoteEditor({ quote, staff, priceList, isNew, onSave }: Props) {
  const [form,    setForm]    = useState<QuoteForm>(() => quoteToForm(quote))
  const [status,  setStatus]  = useState<QuoteStatus>(quote.status)
  const [saving,  setSaving]  = useState(false)
  const [dirty,   setDirty]   = useState(!!isNew)

  const totals = calcTotals(form.line_items)

  function setField<K extends keyof QuoteForm>(key: K, value: QuoteForm[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setDirty(true)
  }

  function handleStaffChange(staffId: string) {
    const member = staff.find(s => s.id === staffId)
    setForm(f => ({
      ...f,
      quoted_by_id:   staffId,
      quoted_by_name: member?.name || '',
    }))
    setDirty(true)
  }

  async function handleSave() {
    if (!form.client_name.trim()) { toast.error('Client name is required'); return }
    if (!form.site.trim())        { toast.error('Site is required'); return }
    if (!form.quoted_by_name)     { toast.error('Please select who is quoting'); return }
    if (form.line_items.length === 0) { toast.error('Add at least one line item'); return }

    setSaving(true)
    try {
      await onSave(form)
      setDirty(false)
      toast.success('Quote saved')
    } catch (e) {
      toast.error('Failed to save quote')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(newStatus: QuoteStatus) {
    if (dirty) {
      toast.error('Save changes before changing status')
      return
    }
    const ok = await updateQuoteStatus(quote.id, newStatus)
    if (ok) {
      setStatus(newStatus)
      toast.success(`Status updated to "${newStatus}"`)
    } else {
      toast.error('Failed to update status')
    }
  }

  // Shareable link
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/quotes/${quote.id}/view`

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl)
    toast.success('Link copied to clipboard')
  }

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {isNew ? 'New quotation' : quote.pi_number}
          </h1>
          {!isNew && (
            <p className="text-sm text-gray-400 mt-0.5">
              Last updated {new Date(quote.updated_at).toLocaleString('en-KE')}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {!isNew && (
            <>
              <button onClick={copyLink} className="btn">
                🔗 Copy link
              </button>
              {/* PDF download — only renders after quote has been saved */}
              <PDFDownloadButton
                quote={{ ...quote, ...totals, line_items: form.line_items as any }}
                fileName={`${quote.pi_number.replace(/\//g, '-')}.pdf`}
              />
            </>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className={`btn btn-primary ${!dirty ? 'opacity-50 cursor-default' : ''}`}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Stage bar — not shown on new quote */}
      {!isNew && (
        <StageBar current={status} onChange={handleStatusChange} />
      )}

      {/* Quote details */}
      <div className="card">
        <h2 className="section-title">Quote details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Quoted by</label>
            <select
              value={form.quoted_by_id}
              onChange={e => handleStaffChange(e.target.value)}>
              <option value="">Select staff member…</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.role.replace('_',' ')})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" value={form.quote_date}
              onChange={e => setField('quote_date', e.target.value)} />
          </div>
          <div>
            <label className="label">Client (ATTN) *</label>
            <input type="text" placeholder="e.g. Starehe Point" value={form.client_name}
              onChange={e => setField('client_name', e.target.value)} />
          </div>
          <div>
            <label className="label">CC</label>
            <input type="text" placeholder="e.g. Jinsha" value={form.cc}
              onChange={e => setField('cc', e.target.value)} />
          </div>
          <div>
            <label className="label">Site *</label>
            <input type="text" placeholder="Construction site name" value={form.site}
              onChange={e => setField('site', e.target.value)} />
          </div>
          <div>
            <label className="label">RE (subject line)</label>
            <input type="text" value={form.subject}
              onChange={e => setField('subject', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="card">
        <h2 className="section-title">Line items</h2>
        <LineItemsTable
          items={form.line_items}
          priceList={priceList}
          onChange={items => { setField('line_items', items); setDirty(true) }}
        />
      </div>

      {/* Totals + Notes */}
      <div className="grid grid-cols-2 gap-5">
        <div className="card">
          <h2 className="section-title">Notes</h2>
          <textarea
            rows={4}
            placeholder="Additional notes for this quote…"
            value={form.notes}
            onChange={e => setField('notes', e.target.value)}
            className="resize-none"
          />
          <p className="text-xs text-gray-400 mt-2">
            Standard payment terms and pump fee notice are printed on the PDF automatically.
          </p>
        </div>
        <div className="card">
          <h2 className="section-title">Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal (excl. VAT)</span>
              <span>{formatKES(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>VAT (16%)</span>
              <span>{formatKES(totals.total_vat)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base text-gray-900 pt-2 border-t border-gray-200">
              <span>Grand total</span>
              <span>{formatKES(totals.grand_total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bank details (read-only reminder) */}
      <div className="card bg-blue-50/30 border-blue-100">
        <h2 className="section-title">Bank details — printed on PDF</h2>
        <div className="flex flex-wrap gap-x-10 gap-y-3 text-sm text-gray-700">
          {[
            ['Account name',   'Rhombus Concrete Ltd'],
            ['Account number', '0692386490001'],
            ['Paybill',        '552800'],
            ['Bank',           'SBM Bank'],
            ['Branch',         'Lenana Road'],
            ['Swift code',     'SBMKKENA'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-gray-400 font-medium">{label}</p>
              <p className="font-semibold text-gray-800">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-blue-100 flex flex-wrap gap-x-8 gap-y-1 text-xs text-gray-500">
          <span>📍 Rhombus HQ, Tara Road off Kiambu Road, Nairobi</span>
          <span>📞 +254-702-700-700 / +254-705-900-000</span>
          <span>✉ info@rhombusconcrete.com</span>
        </div>
      </div>
    </div>
  )
}
