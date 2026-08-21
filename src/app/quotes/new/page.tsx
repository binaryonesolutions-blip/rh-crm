'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchStaff, fetchPriceList, createQuote } from '@/lib/supabase'
import QuoteEditor from '@/components/QuoteEditor'
import type { Staff, PriceListEntry, QuoteForm, Quote } from '@/types'

const EMPTY_QUOTE: Quote = {
  id:                   '',
  pi_number:            'Auto-assigned on save',
  invoice_number:       null,
  status:               'draft',
  quoted_by_id:         null,
  quoted_by_name:       '',
  client_name:          '',
  cc:                   null,
  site:                 '',
  subject:              'Quotation for the supply of Ready Mix Concrete',
  quote_date:           new Date().toISOString().slice(0, 10),
  sap_quote_no:         null,
  sap_so_no:            null,
  odoo_opportunity_ref: null,
  subtotal:             0,
  total_vat:            0,
  grand_total:          0,
  vat_rate:             0.16,
  bank_account_id:      null,
  notes:                null,
  created_at:           new Date().toISOString(),
  updated_at:           new Date().toISOString(),
  line_items:           [],
}

export default function NewQuotePage() {
  const router = useRouter()
  const [staff,     setStaff]     = useState<Staff[]>([])
  const [priceList, setPriceList] = useState<PriceListEntry[]>([])

  useEffect(() => {
    fetchStaff().then(setStaff)
    fetchPriceList().then(setPriceList)
  }, [])

  async function handleSave(form: QuoteForm) {
    const id = await createQuote(form)
    if (!id) throw new Error('Create failed')
    router.push(`/quotes/${id}?share=1`)
  }

  return (
    <QuoteEditor
      quote={EMPTY_QUOTE}
      staff={staff}
      priceList={priceList}
      isNew
      onSave={handleSave}
    />
  )
}
