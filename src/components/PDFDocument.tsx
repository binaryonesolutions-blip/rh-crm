// Rhombus Concrete — PDF Document (client-side only, ssr: false)
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { Quote, BankAccount } from '@/types'
import { formatNum, formatKES } from '@/lib/calculations'

const BLUE       = '#185FA5'
const BLUE_LIGHT = '#EFF6FF'

const s = StyleSheet.create({
  page:       { fontFamily: 'Helvetica', fontSize: 9, color: '#1a1a1a', padding: 40, backgroundColor: '#fff' },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 14, borderBottom: `2 solid ${BLUE}` },
  logo:       { width: 130, height: 46, objectFit: 'contain' },
  contact:    { fontSize: 7.5, color: '#555', marginTop: 2 },
  docTitle:   { fontSize: 15, fontFamily: 'Helvetica-Bold', color: BLUE, textAlign: 'right' },
  piNum:      { fontSize: 8, color: '#888', textAlign: 'right', marginTop: 3 },
  metaBox:    { flexDirection: 'row', gap: 12, marginBottom: 14, backgroundColor: BLUE_LIGHT, padding: 10, borderRadius: 3 },
  metaCol:    { flex: 1 },
  metaLbl:    { fontSize: 7, color: '#888', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 2 },
  metaVal:    { fontSize: 9 },
  re:         { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#333', marginBottom: 10 },
  tHead:      { flexDirection: 'row', backgroundColor: BLUE, padding: '5 4' },
  tRow:       { flexDirection: 'row', borderBottom: '0.5 solid #e5e7eb', padding: '5 4' },
  tRowAlt:    { flexDirection: 'row', borderBottom: '0.5 solid #e5e7eb', padding: '5 4', backgroundColor: '#f9fafb' },
  th:         { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff' },
  td:         { fontSize: 8, color: '#374151' },
  tdMuted:    { fontSize: 8, color: '#9ca3af' },
  // Columns: QTY | UNIT | DESCRIPTION | UNIT RATE | AMOUNT
  cQty:       { width: 32, textAlign: 'right' },
  cUnit:      { width: 28, textAlign: 'center' },
  cDesc:      { flex: 1 },
  cRate:      { width: 72, textAlign: 'right' },
  cAmount:    { width: 80, textAlign: 'right' },
  totWrap:    { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  totBox:     { width: 200 },
  totRow:     { flexDirection: 'row', justifyContent: 'space-between', padding: '3 0', borderBottom: '0.5 solid #e5e7eb' },
  totLbl:     { fontSize: 8, color: '#555' },
  totVal:     { fontSize: 8 },
  grandRow:   { flexDirection: 'row', justifyContent: 'space-between', padding: '6 0' },
  grandLbl:   { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BLUE },
  grandVal:   { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BLUE },
  nbWrap:     { marginTop: 14, fontSize: 8, color: '#555', borderTop: '1 solid #e5e7eb', paddingTop: 8 },
  bold:       { fontFamily: 'Helvetica-Bold', color: '#e53e3e' },
  bankSec:    { marginTop: 14, borderTop: `1.5 solid ${BLUE}`, paddingTop: 10 },
  bankTitle:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 5, textTransform: 'uppercase' },
  bankGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bankItem:   { width: '30%' },
  bankLbl:    { fontSize: 7, color: '#888', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 1 },
  bankVal:    { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  footer:     { position: 'absolute', bottom: 24, left: 40, right: 40, borderTop: '0.5 solid #e5e7eb', paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  footerTxt:  { fontSize: 7, color: '#aaa' },
})

interface Props { quote: Quote & { bank_account?: BankAccount | null } }

export default function PDFDocument({ quote }: Props) {
  const lines    = quote.line_items || []
  const logoSrc  = `${window.location.origin}/logo.jpg`
  const vatRate  = (quote as any).vat_rate ?? 0.16
  const vatPct   = Math.round(vatRate * 100)
  const docTitle = quote.status === 'invoiced' ? 'INVOICE' : 'QUOTATION'

  const totalConcreteM3 = lines
    .filter((l: any) => (l.item_type || 'concrete') === 'concrete')
    .reduce((s: number, l: any) => s + (l.qty || 0), 0)

  const bank = (quote as any).bank_account as BankAccount | null | undefined

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Image src={logoSrc} style={s.logo} />
            <Text style={[s.contact, { marginTop: 6 }]}>Rhombus HQ, Tara Road off Kiambu Road, Nairobi</Text>
            <Text style={s.contact}>{(quote as any).company_phone || '+254-702-700-700 / +254-705-900-000'}</Text>
            <Text style={s.contact}>info@rhombusconcrete.com</Text>
          </View>
          <View>
            <Text style={s.docTitle}>{docTitle}</Text>
            <Text style={s.piNum}>{quote.pi_number}</Text>
            {quote.invoice_number && <Text style={s.piNum}>Ref: {quote.invoice_number}</Text>}
          </View>
        </View>

        {/* Meta */}
        <View style={s.metaBox}>
          <View style={s.metaCol}>
            <Text style={s.metaLbl}>Date</Text>
            <Text style={s.metaVal}>
              {new Date(quote.quote_date).toLocaleDateString('en-KE', { day:'2-digit', month:'long', year:'numeric' })}
            </Text>
          </View>
          <View style={s.metaCol}>
            <Text style={s.metaLbl}>ATTN</Text>
            <Text style={s.metaVal}>{quote.client_name}</Text>
          </View>
          {quote.cc && <View style={s.metaCol}><Text style={s.metaLbl}>CC</Text><Text style={s.metaVal}>{quote.cc}</Text></View>}
          <View style={s.metaCol}><Text style={s.metaLbl}>Site</Text><Text style={s.metaVal}>{quote.site}</Text></View>
          <View style={s.metaCol}><Text style={s.metaLbl}>Quoted by</Text><Text style={s.metaVal}>{quote.quoted_by_name}</Text></View>
        </View>

        {/* RE */}
        <Text style={s.re}>RE: {quote.subject}</Text>

        {/* Table header */}
        <View style={s.tHead}>
          <Text style={[s.th, s.cQty]}>QTY</Text>
          <Text style={[s.th, s.cUnit]}>UNIT</Text>
          <Text style={[s.th, s.cDesc]}>DESCRIPTION</Text>
          <Text style={[s.th, s.cRate]}>Unit Rate{'\n'}(KSHS)</Text>
          <Text style={[s.th, s.cAmount]}>Amount{'\n'}(KSHS)</Text>
        </View>

        {lines.map((line: any, i: number) => {
          const itemType  = line.item_type || 'concrete'
          const isPump    = itemType === 'pump'
          const isMob     = itemType === 'pump_mob'
          const isTrans   = itemType === 'transport'
          const unit      = line.unit || 'm³'

          // Effective qty and unit price
          const qty        = isPump ? totalConcreteM3 : (line.qty ?? 0)
          const unitPrice  = line.unit_price ?? 0
          const lineTotal  = round2(qty * unitPrice)

          // Description with distance for transport
          let desc = line.description || ''
          if (isTrans && line.distance_km > 0) desc += `  (${line.distance_km} km return trip)`

          return (
            <View key={line.id || i} style={i % 2 === 0 ? s.tRow : s.tRowAlt}>
              <Text style={[s.td, s.cQty]}>{qty}</Text>
              <Text style={[s.td, s.cUnit]}>{unit}</Text>
              <Text style={[s.td, s.cDesc]}>{desc}</Text>
              <Text style={[s.td, s.cRate]}>{formatNum(unitPrice)}</Text>
              <Text style={[s.td, s.cAmount, { fontFamily: 'Helvetica-Bold' }]}>{formatNum(lineTotal)}</Text>
            </View>
          )
        })}

        {/* Totals */}
        <View style={s.totWrap}>
          <View style={s.totBox}>
            <View style={s.totRow}>
              <Text style={s.totLbl}>TOTAL</Text>
              <Text style={s.totVal}>{formatNum(quote.subtotal)}</Text>
            </View>
            <View style={s.totRow}>
              <Text style={s.totLbl}>VAT {vatPct}%</Text>
              <Text style={s.totVal}>{formatNum(quote.total_vat)}</Text>
            </View>
            <View style={s.grandRow}>
              <Text style={s.grandLbl}>GRAND TOTAL</Text>
              <Text style={s.grandVal}>{formatNum(quote.grand_total)}</Text>
            </View>
          </View>
        </View>

        {/* NB notes */}
        <View style={s.nbWrap}>
          <Text><Text style={s.bold}>NB: THE PAYMENT TERMS ARE 100% UPFRONT BEFORE DELIVERY.</Text></Text>
          {'\n'}
          <Text><Text style={s.bold}>NB: PLEASE NOTE THAT VOLUMES BELOW 50M³ ATTRACT A MOBILIZATION FEE BETWEEN 25,000–70,000 KSH.</Text></Text>
          {(quote as any).notes ? <Text style={{ marginTop: 4, color: '#555' }}>{(quote as any).notes}</Text> : null}
        </View>

        {/* Bank details */}
        {bank && (
          <View style={s.bankSec}>
            <Text style={s.bankTitle}>Payment details</Text>
            {bank.account_number ? (
              <View style={s.bankGrid}>
                {([
                  ['Account name',   bank.account_name],
                  ['Account number', bank.account_number],
                  bank.paybill    ? ['Paybill',    bank.paybill]    : null,
                  bank.bank       ? ['Bank',       bank.bank]       : null,
                  bank.branch     ? ['Branch',     bank.branch]     : null,
                  bank.swift_code ? ['Swift code', bank.swift_code] : null,
                ] as ([string, string] | null)[]).filter((r): r is [string, string] => r !== null).map(([label, value]) => (
                  <View key={label as string} style={s.bankItem}>
                    <Text style={s.bankLbl}>{label}</Text>
                    <Text style={s.bankVal}>{value}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontSize: 8, color: '#555' }}>{bank.name} — cash payment</Text>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>Rhombus Concrete Ltd — {quote.pi_number}</Text>
          <Text style={s.footerTxt} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}

function round2(n: number) { return Math.round(n * 100) / 100 }
