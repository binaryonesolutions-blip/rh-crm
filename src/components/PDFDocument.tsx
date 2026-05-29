// ============================================================
// Rhombus Concrete — PDF Quote Document
// Uses @react-pdf/renderer (client-side only, ssr: false)
// Logo served from /public/logo.jpg — replace that file to update branding.
// ============================================================

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { Quote } from '@/types'
import { formatNum, formatKES, calcLine } from '@/lib/calculations'

const BLUE       = '#185FA5'
const BLUE_LIGHT = '#F0F6FC'

const styles = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', fontSize: 9, color: '#1a1a1a', padding: 36, backgroundColor: '#fff' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: `2 solid ${BLUE}`, paddingBottom: 12 },
  logo:        { width: 160, height: 54, objectFit: 'contain', objectPositionX: 0 },
  contactWrap: { marginTop: 5 },
  contactLine: { fontSize: 7.5, color: '#555', marginTop: 1.5 },
  docTitle:    { fontSize: 14, fontFamily: 'Helvetica-Bold', color: BLUE, textAlign: 'right' },
  piNumber:    { fontSize: 8, color: '#555', textAlign: 'right', marginTop: 3 },
  metaGrid:    { flexDirection: 'row', gap: 14, marginBottom: 16, backgroundColor: BLUE_LIGHT, padding: 10, borderRadius: 4 },
  metaCol:     { flex: 1 },
  metaLabel:   { fontSize: 7, color: '#888', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 2 },
  metaValue:   { fontSize: 9, color: '#1a1a1a' },
  tableHeader: { flexDirection: 'row', backgroundColor: BLUE, padding: '5 4' },
  tableRow:    { flexDirection: 'row', borderBottom: '0.5 solid #e5e7eb', padding: '4 4' },
  tableRowAlt: { flexDirection: 'row', borderBottom: '0.5 solid #e5e7eb', padding: '4 4', backgroundColor: '#fafafa' },
  thText:      { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff' },
  tdText:      { fontSize: 8, color: '#374151' },
  colQty:      { width: 36 },
  colDesc:     { flex: 1 },
  colNum:      { width: 58, textAlign: 'right' },
  totalsWrap:  { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  totalsBox:   { width: 220 },
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', padding: '3 0', borderBottom: '0.5 solid #e5e7eb' },
  totalLabel:  { fontSize: 8, color: '#555' },
  totalValue:  { fontSize: 8, color: '#1a1a1a' },
  grandRow:    { flexDirection: 'row', justifyContent: 'space-between', padding: '5 0', marginTop: 2 },
  grandLabel:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BLUE },
  grandValue:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BLUE },
  notesWrap:   { marginTop: 16, fontSize: 8, color: '#555', borderTop: '1 solid #e5e7eb', paddingTop: 8 },
  notesBold:   { fontFamily: 'Helvetica-Bold', color: '#333' },
  bankSection: { marginTop: 16, borderTop: `1.5 solid ${BLUE}`, paddingTop: 10 },
  bankTitle:   { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  bankGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bankItem:    { width: '30%' },
  bankLabel:   { fontSize: 7, color: '#888', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 1 },
  bankValue:   { fontSize: 8, color: '#1a1a1a', fontFamily: 'Helvetica-Bold' },
  footer:      { position: 'absolute', bottom: 24, left: 36, right: 36, borderTop: '0.5 solid #e5e7eb', paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  footerText:  { fontSize: 7, color: '#aaa' },
})

interface Props { quote: Quote }

export default function PDFDocument({ quote }: Props) {
  const lines = quote.line_items || []
  // Logo from /public/logo.jpg — to swap branding, just replace that file
  const logoSrc = `${window.location.origin}/logo.jpg`

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Image src={logoSrc} style={styles.logo} />
            <View style={styles.contactWrap}>
              <Text style={styles.contactLine}>Rhombus HQ, Tara Road off Kiambu Road, Nairobi</Text>
              <Text style={styles.contactLine}>+254-702-700-700 / +254-705-900-000</Text>
              <Text style={styles.contactLine}>info@rhombusconcrete.com</Text>
            </View>
          </View>
          <View>
            <Text style={styles.docTitle}>PROFORMA QUOTE</Text>
            <Text style={styles.piNumber}>{quote.pi_number}</Text>
            {quote.invoice_number && (
              <Text style={styles.piNumber}>Ref: {quote.invoice_number}</Text>
            )}
          </View>
        </View>

        {/* Meta grid */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>
              {new Date(quote.quote_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}
            </Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Client (ATTN)</Text>
            <Text style={styles.metaValue}>{quote.client_name}</Text>
          </View>
          {quote.cc && (
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>CC</Text>
              <Text style={styles.metaValue}>{quote.cc}</Text>
            </View>
          )}
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Site</Text>
            <Text style={styles.metaValue}>{quote.site}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Quoted by</Text>
            <Text style={styles.metaValue}>{quote.quoted_by_name}</Text>
          </View>
        </View>

        {/* RE */}
        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#333' }}>
            RE: {quote.subject}
          </Text>
        </View>

        {/* Line items */}
        <View style={styles.tableHeader}>
          <Text style={[styles.thText, styles.colQty]}>Qty{'\n'}(M³)</Text>
          <Text style={[styles.thText, styles.colDesc]}>Description</Text>
          <Text style={[styles.thText, styles.colNum]}>Unit{'\n'}price</Text>
          <Text style={[styles.thText, styles.colNum]}>Trans{'\n'}port</Text>
          <Text style={[styles.thText, styles.colNum]}>Pump{'\n'}ing</Text>
          <Text style={[styles.thText, styles.colNum]}>VAT{'\n'}levy</Text>
          <Text style={[styles.thText, styles.colNum]}>VAT{'\n'}16%</Text>
          <Text style={[styles.thText, styles.colNum]}>Total{'\n'}KSH</Text>
        </View>

        {lines.map((line, i) => {
          const calc = calcLine(line)
          return (
            <View key={line.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tdText, styles.colQty]}>{line.qty}</Text>
              <Text style={[styles.tdText, styles.colDesc]}>{line.description}</Text>
              <Text style={[styles.tdText, styles.colNum]}>{formatNum(line.unit_price)}</Text>
              <Text style={[styles.tdText, styles.colNum]}>{formatNum(line.transport)}</Text>
              <Text style={[styles.tdText, styles.colNum]}>{formatNum(line.pumping)}</Text>
              <Text style={[styles.tdText, styles.colNum]}>{formatNum(line.vat_levy)}</Text>
              <Text style={[styles.tdText, styles.colNum]}>{formatNum(calc.vat_amount)}</Text>
              <Text style={[styles.tdText, styles.colNum, { fontFamily: 'Helvetica-Bold' }]}>{formatNum(calc.line_total)}</Text>
            </View>
          )
        })}

        {/* Totals */}
        <View style={styles.totalsWrap}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal (excl. VAT)</Text>
              <Text style={styles.totalValue}>{formatKES(quote.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>VAT (16%)</Text>
              <Text style={styles.totalValue}>{formatKES(quote.total_vat)}</Text>
            </View>
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>Grand total</Text>
              <Text style={styles.grandValue}>{formatKES(quote.grand_total)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.notesWrap}>
          <Text><Text style={styles.notesBold}>NB: </Text>Payment terms are 100% upfront before delivery.</Text>
          {'\n'}
          <Text><Text style={styles.notesBold}>NB: </Text>Volumes below 50M³ attract a pump mobilisation fee of between KSH 25,000–50,000.</Text>
          {quote.notes && <Text style={{ marginTop: 4 }}>{quote.notes}</Text>}
        </View>

        {/* Payment details */}
        <View style={styles.bankSection}>
          <Text style={styles.bankTitle}>Payment details</Text>
          <View style={styles.bankGrid}>
            {[
              ['Account name',   'Rhombus Concrete Ltd'],
              ['Account number', '0692386490001'],
              ['Paybill',        '552800'],
              ['Bank',           'SBM Bank'],
              ['Branch',         'Lenana Road'],
              ['Swift code',     'SBMKKENA'],
            ].map(([label, value]) => (
              <View key={label} style={styles.bankItem}>
                <Text style={styles.bankLabel}>{label}</Text>
                <Text style={styles.bankValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Rhombus Concrete Ltd — {quote.pi_number}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
