'use client'

// Isolated wrapper so @react-pdf/renderer never runs during SSR/hydration.
// QuoteEditor imports this via dynamic({ ssr: false }).

import { PDFDownloadLink } from '@react-pdf/renderer'
import PDFDocument from './PDFDocument'
import type { Quote } from '@/types'

interface Props {
  quote: Quote
  fileName: string
}

export default function PDFDownloadButton({ quote, fileName }: Props) {
  return (
    <PDFDownloadLink
      document={<PDFDocument quote={quote} />}
      fileName={fileName}
    >
      {(({ loading }: { loading: boolean }) => (
        <button className="btn" disabled={loading}>
          {loading ? 'Preparing PDF…' : '↓ Download Quote PDF'}
        </button>
      )) as any}
    </PDFDownloadLink>
  )
}
