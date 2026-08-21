'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import type { Quote, QuoteForm, Staff, PriceListEntry, QuoteStatus, VatRate, PumpConfig, TransportConfig, BankAccount } from '@/types'
import { VAT_RATE_OPTIONS, DEFAULT_PUMP_CONFIG, DEFAULT_TRANSPORT_CONFIG, LOCKED_STATUSES, STATUS_LABELS } from '@/types'
import { calcTotals, formatKES } from '@/lib/calculations'
import { updateQuoteStatus, fetchPricingConfig, parsePricingConfig, fetchBankAccounts } from '@/lib/supabase'
import StageBar from './StageBar'
import LineItemsTable from './LineItemsTable'
import { shareQuoteToWhatsApp, preloadShare } from '@/lib/share'

const PDFDownloadButton = dynamic(() => import('./PDFDownloadButton'), { ssr: false })

interface Props {
  quote:     Quote
  staff:     Staff[]
  priceList: PriceListEntry[]
  isNew?:    boolean
  onSave:    (form: QuoteForm) => Promise<void>
}

function quoteToForm(q: Quote): QuoteForm {
  return {
    quoted_by_id:         q.quoted_by_id        || '',
    quoted_by_name:       q.quoted_by_name       || '',
    client_name:          q.client_name          || '',
    cc:                   q.cc                   || '',
    site:                 q.site                 || '',
    subject:              q.subject              || 'Quotation for the supply of Ready Mix Concrete',
    quote_date:           q.quote_date           || new Date().toISOString().slice(0, 10),
    sap_quote_no:         q.sap_quote_no         || '',
    sap_so_no:            q.sap_so_no            || '',
    odoo_opportunity_ref: q.odoo_opportunity_ref || '',
    notes:                q.notes                || '',
    vat_rate:             (q.vat_rate as VatRate) ?? 0.16,
    bank_account_id:      (q as any).bank_account_id || '',
    line_items: (q.line_items || []).map(l => ({
      id:          l.id,
      sort_order:  l.sort_order,
      item_type:   (l as any).item_type   || 'concrete',
      qty:         l.qty,
      unit:        (l as any).unit        || 'm³',
      description: l.description,
      unit_price:  l.unit_price,
      distance_km: (l as any).distance_km || 0,
    })),
  }
}

export default function QuoteEditor({ quote, staff, priceList, isNew, onSave }: Props) {
  const [form,         setForm]         = useState<QuoteForm>(() => quoteToForm(quote))
  const [status,       setStatus]       = useState<QuoteStatus>(quote.status)
  const [saving,       setSaving]       = useState(false)
  const [dirty,        setDirty]        = useState(!!isNew)
  const [pumpCfg,      setPumpCfg]      = useState<PumpConfig>(DEFAULT_PUMP_CONFIG)
  const [transCfg,     setTransCfg]     = useState<TransportConfig>(DEFAULT_TRANSPORT_CONFIG)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [shareOpen,    setShareOpen]    = useState(false)
  const [sharing,      setSharing]      = useState(false)

  const isLocked = LOCKED_STATUSES.includes(status)

  useEffect(() => {
    fetchPricingConfig().then(rows => {
      if (rows.length === 0) return
      const { pump, transport } = parsePricingConfig(rows)
      setPumpCfg(pump)
      setTransCfg(transport)
    })
    fetchBankAccounts().then(setBankAccounts)
    preloadShare() // warm the PDF modules so the first download/share is instant
  }, [])

  // Freshly-created quotes redirect here with ?share=1 — auto-open the share prompt.
  useEffect(() => {
    if (isNew) return
    if (new URLSearchParams(window.location.search).get('share') === '1') {
      setShareOpen(true)
      window.history.replaceState({}, '', `/quotes/${quote.id}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totals = calcTotals(form.line_items, form.vat_rate)

  function setField<K extends keyof QuoteForm>(key: K, value: QuoteForm[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setDirty(true)
  }

  function handleStaffChange(staffId: string) {
    const member = staff.find(s => s.id === staffId)
    setForm(f => ({ ...f, quoted_by_id: staffId, quoted_by_name: member?.name || '' }))
    setDirty(true)
  }

  async function handleSave() {
    if (!form.client_name.trim())     { toast.error('Client name is required'); return }
    if (!form.site.trim())            { toast.error('Site is required'); return }
    if (!form.quoted_by_name)         { toast.error('Please select who is quoting'); return }
    if (form.line_items.length === 0) { toast.error('Add at least one line item'); return }
    setSaving(true)
    try {
      await onSave(form)
      setDirty(false)
      toast.success('Quote saved')
      if (!isNew) setShareOpen(true)   // offer to send to WhatsApp
    } catch {
      toast.error('Failed to save quote')
    } finally {
      setSaving(false)
    }
  }

  const shareFileName = () =>
    `${(quote.client_name || 'Quote').replace(/[\/\\:*?"<>|]/g, '-').trim()} - ${quote.pi_number.replace(/\//g, '-')}.pdf`

  const shareMessage = () =>
    `*Rhombus Concrete*\n${status === 'invoiced' ? 'Invoice' : 'Quotation'} ${quote.pi_number}\n` +
    `Client: ${quote.client_name}\nSite: ${quote.site}\nTotal: ${formatKES(totals.grand_total)}`

  async function runShare() {
    setSharing(true)
    try {
      const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/quotes/${quote.id}/view`
      const res = await shareQuoteToWhatsApp({
        quote:    { ...quote, ...totals, line_items: form.line_items as any, bank_account: selectedBank ?? null },
        fileName: shareFileName(),
        message:  shareMessage(),
        viewUrl,
      })
      // First share moves the quote Draft → Quotation sent.
      if (status === 'draft') {
        const ok = await updateQuoteStatus(quote.id, 'sent')
        if (ok) setStatus('sent')
      }
      toast.success(res.method === 'file' ? 'Shared to WhatsApp' : 'PDF downloaded — attach it in WhatsApp')
      setShareOpen(false)
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setShareOpen(false)   // user dismissed the share sheet — leave status unchanged
      } else {
        toast.error('Could not share to WhatsApp')
      }
    } finally {
      setSharing(false)
    }
  }

  async function handleStatusChange(newStatus: QuoteStatus) {
    if (dirty) { toast.error('Save changes before changing status'); return }
    const ok = await updateQuoteStatus(quote.id, newStatus)
    if (ok) {
      setStatus(newStatus)
      toast.success(`Status updated to "${newStatus}"`)
    } else {
      toast.error('Failed to update status')
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL}/quotes/${quote.id}/view`)
    toast.success('Link copied')
  }

  const vatLabel     = VAT_RATE_OPTIONS.find(o => o.value === form.vat_rate)?.label ?? '16%'
  const selectedBank = bankAccounts.find(b => b.id === form.bank_account_id)

  const bankRows: [string, string][] = selectedBank ? (
    ([
      ['Account name',   selectedBank.account_name],
      ['Account number', selectedBank.account_number],
      selectedBank.paybill    ? ['Paybill',    selectedBank.paybill]    : null,
      selectedBank.bank       ? ['Bank',       selectedBank.bank]       : null,
      selectedBank.branch     ? ['Branch',     selectedBank.branch]     : null,
      selectedBank.swift_code ? ['Swift code', selectedBank.swift_code] : null,
    ] as ([string, string] | null)[]).filter((r): r is [string, string] => r !== null)
  ) : []

  return (
    <div className="space-y-5">

      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {isNew ? 'New quotation' : quote.pi_number}
          </h1>
          {!isNew && (
            <p className="text-sm text-gray-400 mt-0.5">
              Last updated {new Date(quote.updated_at).toLocaleString('en-KE')}
            </p>
          )}
          {isLocked && (
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
              🔒 Locked — {status === 'confirmed' ? 'order confirmed' : 'invoiced'}
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {!isNew && (
            <>
              <button onClick={copyLink} className="btn">🔗 Copy link</button>
              <PDFDownloadButton
                quote={{ ...quote, ...totals, line_items: form.line_items as any, bank_account: selectedBank ?? null }}
                fileName={shareFileName()}
              />
              <button
                onClick={() => { if (dirty) { toast.error('Save your changes first'); return } setShareOpen(true) }}
                className="btn bg-[#25D366] text-white border-transparent hover:bg-[#1da851]"
              >
                📤 WhatsApp
              </button>
            </>
          )}
          {!isLocked && (
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className={`btn btn-primary ${!dirty ? 'opacity-50 cursor-default' : ''}`}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {!isNew && <StageBar current={status} onChange={handleStatusChange} />}

      {/* Quote details */}
      <div className="card">
        <h2 className="section-title">Quote details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Quoted by</label>
            <select value={form.quoted_by_id} disabled={isLocked}
              onChange={e => handleStaffChange(e.target.value)}>
              <option value="">Select staff member…</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" value={form.quote_date} disabled={isLocked}
              onChange={e => setField('quote_date', e.target.value)} />
          </div>
          <div>
            <label className="label">Client (ATTN) *</label>
            <input type="text" value={form.client_name} disabled={isLocked}
              placeholder="e.g. Chris"
              onChange={e => setField('client_name', e.target.value)} />
          </div>
          <div>
            <label className="label">CC</label>
            <input type="text" value={form.cc} disabled={isLocked}
              placeholder="e.g. Jinsha"
              onChange={e => setField('cc', e.target.value)} />
          </div>
          <div>
            <label className="label">Site *</label>
            <input type="text" value={form.site} disabled={isLocked}
              placeholder="e.g. Limuru Road"
              onChange={e => setField('site', e.target.value)} />
          </div>
          <div>
            <label className="label">RE (subject)</label>
            <input type="text" value={form.subject} disabled={isLocked}
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
          vatRate={form.vat_rate}
          pumpConfig={pumpCfg}
          transportConfig={transCfg}
          locked={isLocked}
          onChange={items => setField('line_items', items)}
        />
      </div>

      {/* Notes + Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="card">
          <h2 className="section-title">Notes</h2>
          <textarea
            rows={4}
            value={form.notes}
            disabled={isLocked}
            placeholder="Additional notes…"
            onChange={e => setField('notes', e.target.value)}
            className="resize-none"
          />
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title mb-0">Summary</h2>
            {!isLocked && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">VAT:</span>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                  {VAT_RATE_OPTIONS.map(opt => (
                    <button key={opt.label}
                      onClick={() => setField('vat_rate', opt.value)}
                      className={`px-3 py-1.5 font-semibold transition-colors ${
                        form.vat_rate === opt.value
                          ? 'bg-rhombus-blue text-white'
                          : 'bg-white text-gray-500 hover:bg-blue-50'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{formatKES(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>VAT ({vatLabel})</span>
              <span>{formatKES(totals.total_vat)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base text-gray-900 pt-2 border-t border-gray-200">
              <span>Grand total</span>
              <span>{formatKES(totals.grand_total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment details */}
      <div className="card bg-blue-50/30 border-blue-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title mb-0">Payment details</h2>
          {!isLocked && (
            <select
              value={form.bank_account_id}
              onChange={e => setField('bank_account_id', e.target.value)}
              className="w-auto text-sm">
              <option value="">— Select bank account —</option>
              {bankAccounts.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
        </div>
        {selectedBank ? (
          selectedBank.account_number ? (
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
              {bankRows.map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 font-medium">{label}</p>
                  <p className="font-semibold text-gray-800">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">{selectedBank.name} — cash / no bank details</p>
          )
        ) : (
          <p className="text-sm text-gray-400">Select a bank account above to show payment details on the PDF.</p>
        )}
      </div>

      {/* WhatsApp share prompt */}
      {shareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !sharing && setShareOpen(false)}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">Send to WhatsApp?</h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              {status === 'draft'
                ? <>This shares the quote PDF to WhatsApp and moves it from <strong>Draft</strong> to <strong>Quotation sent</strong>.</>
                : <>This shares the updated quote PDF to WhatsApp. Status stays <strong>{STATUS_LABELS[status]}</strong>.</>}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              On a phone the PDF attaches straight into WhatsApp. On a laptop it downloads the PDF and opens WhatsApp with a link — just attach the file.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button className="btn" disabled={sharing} onClick={() => setShareOpen(false)}>Not now</button>
              <button
                className="btn text-white border-transparent bg-[#25D366] hover:bg-[#1da851] disabled:opacity-60"
                disabled={sharing}
                onClick={runShare}
              >
                {sharing ? 'Preparing…' : '📤 Share to WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
