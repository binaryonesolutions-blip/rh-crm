'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { fetchQuote, fetchStaff, fetchPriceList, updateQuote } from '@/lib/supabase'
import QuoteEditor from '@/components/QuoteEditor'
import type { Quote, Staff, PriceListEntry, QuoteForm } from '@/types'

export default function QuoteEditPage() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()

  const [quote,     setQuote]     = useState<Quote | null>(null)
  const [staff,     setStaff]     = useState<Staff[]>([])
  const [priceList, setPriceList] = useState<PriceListEntry[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([fetchQuote(id), fetchStaff(), fetchPriceList()])
      .then(([q, s, p]) => {
        setQuote(q)
        setStaff(s)
        setPriceList(p)
        setLoading(false)
      })
  }, [id])

  async function handleSave(form: QuoteForm) {
    const ok = await updateQuote(id, form)
    if (!ok) throw new Error('Update failed')
    // Re-fetch to get updated totals from DB triggers
    const updated = await fetchQuote(id)
    if (updated) setQuote(updated)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
      Loading quote…
    </div>
  )

  if (!quote) return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
      <p>Quote not found.</p>
      <button onClick={() => router.push('/')} className="btn mt-4">← Back to quotes</button>
    </div>
  )

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => router.push('/')} className="text-sm text-gray-400 hover:text-gray-600">
          ← All quotes
        </button>
        <a
          href={`/quotes/${id}/view`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-rhombus-blue hover:underline"
        >
          Open client view ↗
        </a>
      </div>
      <QuoteEditor
        quote={quote}
        staff={staff}
        priceList={priceList}
        onSave={handleSave}
      />
    </div>
  )
}
