'use client'

// PDF download + WhatsApp sharing for quotes.
// The PDF is generated ON DEMAND (on click) rather than eagerly, which avoids
// @react-pdf/renderer's yoga engine double-initializing under React strict mode.
// @react-pdf/renderer is imported lazily so it never runs during SSR, and both
// download and share go through buildPdfBlob() so only one instance is ever loaded.

import type { Quote, BankAccount } from '@/types'

type ShareQuote = Quote & { bank_account?: BankAccount | null }

export interface ShareResult {
  method: 'file' | 'fallback'
}

async function buildPdfBlob(quote: ShareQuote): Promise<Blob> {
  const [{ pdf }, { default: PDFDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/PDFDocument'),
  ])
  return pdf(<PDFDocument quote={quote} />).toBlob()
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/** Warm the heavy PDF modules so the first download/share click is fast (keeps
 *  navigator.share inside the browser's user-activation window). */
export function preloadShare() {
  import('@react-pdf/renderer')
  import('@/components/PDFDocument')
}

export async function downloadQuotePdf(quote: ShareQuote, fileName: string) {
  triggerDownload(await buildPdfBlob(quote), fileName)
}

export async function shareQuoteToWhatsApp(opts: {
  quote:    ShareQuote
  fileName: string
  message:  string
  viewUrl:  string
}): Promise<ShareResult> {
  const { quote, fileName, message, viewUrl } = opts
  const blob = await buildPdfBlob(quote)
  const file = new File([blob], fileName, { type: 'application/pdf' })
  const nav  = navigator as Navigator & { canShare?: (d: any) => boolean }

  // Mobile / supported: attach the actual PDF to WhatsApp.
  if (nav.canShare && nav.canShare({ files: [file] })) {
    await nav.share({ files: [file], title: fileName, text: message })
    return { method: 'file' }
  }

  // Desktop fallback: download the PDF, then open WhatsApp with the message + link.
  triggerDownload(blob, fileName)
  window.open(`https://wa.me/?text=${encodeURIComponent(`${message}\n${viewUrl}`)}`, '_blank', 'noopener')
  return { method: 'fallback' }
}
