'use client'

// Generates the quote PDF on click (not eagerly), so react-pdf's layout engine
// only initializes when the user actually downloads — avoiding the strict-mode
// double-init BindingError and keeping a single react-pdf instance via @/lib/share.

import { useState } from 'react'
import toast from 'react-hot-toast'
import { downloadQuotePdf } from '@/lib/share'
import type { Quote, BankAccount } from '@/types'

interface Props {
  quote: Quote & { bank_account?: BankAccount | null }
  fileName: string
}

export default function PDFDownloadButton({ quote, fileName }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      await downloadQuotePdf(quote, fileName)
    } catch {
      toast.error('Could not generate PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button className="btn" disabled={loading} onClick={handleDownload}>
      {loading ? 'Preparing PDF…' : '↓ Download Quote PDF'}
    </button>
  )
}
